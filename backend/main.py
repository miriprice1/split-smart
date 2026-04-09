# Load .env before anything else
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import os
import secrets
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, init_db
from algorithm import calculate_settlements
from email_service import send_event_invitation, send_settlement_summary, send_group_invite
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, optional_user,
)

app = FastAPI(title="SplitSmart API")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

router = APIRouter(prefix="/api")


@app.on_event("startup")
def startup():
    init_db()



# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterData(BaseModel):
    name: str
    email: str
    password: str

class LoginData(BaseModel):
    email: str
    password: str

class GroupCreate(BaseModel):
    name: str

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    remove_members: List[str] = []

class JoinGroupData(BaseModel):
    invite_code: str

class EventCreate(BaseModel):
    name: str
    participants: List[str]

class EventRename(BaseModel):
    name: str

class PaymentUpdate(BaseModel):
    payments: List[dict]

class ParticipantsUpdate(BaseModel):
    participants: List[str]

class InviteEmailData(BaseModel):
    email: str
    invite_url: str


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/register", status_code=201)
def register(data: RegisterData):
    if not data.name.strip():
        raise HTTPException(400, "Name required")
    if not data.email.strip():
        raise HTTPException(400, "Email required")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (data.email.lower(),)).fetchone()
    if existing:
        db.close()
        raise HTTPException(400, "Email already registered")
    cursor = db.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (data.name.strip(), data.email.lower().strip(), hash_password(data.password)),
    )
    user_id = cursor.lastrowid
    db.commit()
    db.close()
    return {"token": create_token(user_id), "user": {"id": user_id, "name": data.name.strip(), "email": data.email.lower()}}


@router.post("/auth/login")
def login(data: LoginData):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (data.email.lower(),)).fetchone()
    db.close()
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "אימייל או סיסמה שגויים")
    return {"token": create_token(user["id"]), "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}


@router.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return current_user


# ── Helpers ───────────────────────────────────────────────────────────────────

def _group_row(db, group_id, current_user_id=None, current_user_name=None):
    g = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not g:
        return None
    members = db.execute(
        """SELECT m.id, m.name, m.email, m.role, m.user_id, u.email as user_email
           FROM members m LEFT JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? ORDER BY m.id""",
        (group_id,)
    ).fetchall()

    my_role = None
    if current_user_id:
        for m in members:
            if m["user_id"] == current_user_id:
                my_role = m["role"]
                break

    # Group admin sees all events; event creator and participants see their events
    if my_role == "admin":
        events = db.execute(
            "SELECT id, name, created_by, status, created_at FROM events WHERE group_id = ? ORDER BY created_at DESC",
            (group_id,),
        ).fetchall()
    elif current_user_name:
        events = db.execute(
            """SELECT id, name, created_by, status, created_at FROM events
               WHERE group_id = ? AND (
                 created_by = ? OR id IN (
                   SELECT event_id FROM payments WHERE member_name = ?
                 )
               ) ORDER BY created_at DESC""",
            (group_id, current_user_name, current_user_name),
        ).fetchall()
    else:
        events = []

    return {
        "id": g["id"], "name": g["name"], "created_by": g["created_by"],
        "created_at": g["created_at"], "invite_code": g["invite_code"],
        "my_role": my_role,
        "members": [
            {"name": m["name"], "email": m["user_email"] or m["email"], "role": m["role"]}
            for m in members
        ],
        "events": [
            {"id": e["id"], "name": e["name"], "created_by": e["created_by"],
             "status": e["status"], "created_at": e["created_at"]}
            for e in events
        ],
    }


def _event_row(db, event_id):
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        return None
    payments = db.execute(
        "SELECT member_name, amount FROM payments WHERE event_id = ? ORDER BY member_name", (event_id,)
    ).fetchall()
    settlements = db.execute(
        "SELECT id, from_member, to_member, amount, status FROM settlements WHERE event_id = ? ORDER BY id", (event_id,)
    ).fetchall()
    return {
        "id": event["id"], "name": event["name"], "group_id": event["group_id"],
        "created_by": event["created_by"], "status": event["status"], "created_at": event["created_at"],
        "payments": [{"member_name": p["member_name"], "amount": p["amount"]} for p in payments],
        "settlements": [{"id": s["id"], "from": s["from_member"], "to": s["to_member"], "amount": s["amount"], "status": s["status"]} for s in settlements],
    }


# ── Groups ────────────────────────────────────────────────────────────────────

@router.get("/groups")
def list_groups(current_user=Depends(get_current_user)):
    db = get_db()
    member_rows = db.execute(
        "SELECT group_id FROM members WHERE user_id = ?", (current_user["id"],)
    ).fetchall()
    result = []
    for row in member_rows:
        g_row = _group_row(db, row["group_id"], current_user["id"], current_user["name"])
        if g_row:
            result.append(g_row)
    result.sort(key=lambda x: x["created_at"], reverse=True)
    db.close()
    return result


@router.post("/groups", status_code=201)
def create_group(data: GroupCreate, current_user=Depends(get_current_user)):
    if not data.name.strip():
        raise HTTPException(400, "Group name required")
    db = get_db()
    invite_code = secrets.token_urlsafe(8)
    cursor = db.execute(
        "INSERT INTO groups (name, created_by, invite_code) VALUES (?, ?, ?)",
        (data.name.strip(), current_user["name"], invite_code),
    )
    group_id = cursor.lastrowid
    db.execute(
        "INSERT INTO members (group_id, name, email, user_id, role) VALUES (?, ?, ?, ?, 'admin')",
        (group_id, current_user["name"], current_user.get("email", ""), current_user["id"]),
    )
    db.commit()
    row = _group_row(db, group_id, current_user["id"], current_user["name"])
    db.close()
    return row


# Must be before /groups/{group_id} so FastAPI doesn't try to cast "invite" as int
@router.get("/groups/invite/{invite_code}")
def get_group_by_invite(invite_code: str, current_user=Depends(get_current_user)):
    db = get_db()
    group = db.execute("SELECT * FROM groups WHERE invite_code = ?", (invite_code,)).fetchone()
    if not group:
        db.close()
        raise HTTPException(404, "קוד הזמנה לא תקין")
    member_count = db.execute(
        "SELECT COUNT(*) as cnt FROM members WHERE group_id = ?", (group["id"],)
    ).fetchone()["cnt"]
    already_member = bool(db.execute(
        "SELECT id FROM members WHERE group_id = ? AND user_id = ?",
        (group["id"], current_user["id"])
    ).fetchone())
    db.close()
    return {
        "id": group["id"],
        "name": group["name"],
        "member_count": member_count,
        "already_member": already_member,
    }


@router.post("/groups/join")
def join_group(data: JoinGroupData, current_user=Depends(get_current_user)):
    db = get_db()
    group = db.execute("SELECT * FROM groups WHERE invite_code = ?", (data.invite_code,)).fetchone()
    if not group:
        db.close()
        raise HTTPException(404, "קוד הזמנה לא תקין")
    existing = db.execute(
        "SELECT id FROM members WHERE group_id = ? AND user_id = ?",
        (group["id"], current_user["id"])
    ).fetchone()
    if not existing:
        db.execute(
            "INSERT INTO members (group_id, name, email, user_id, role) VALUES (?, ?, ?, ?, 'member')",
            (group["id"], current_user["name"], current_user.get("email", ""), current_user["id"]),
        )
        db.commit()
    row = _group_row(db, group["id"], current_user["id"], current_user["name"])
    db.close()
    return row


@router.get("/groups/{group_id}")
def get_group(group_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    row = _group_row(db, group_id, current_user["id"], current_user["name"])
    db.close()
    if not row:
        raise HTTPException(404, "Group not found")
    if row["my_role"] is None:
        raise HTTPException(403, "אינך חבר בקבוצה זו")
    return row


@router.put("/groups/{group_id}")
def update_group(group_id: int, data: GroupUpdate, current_user=Depends(get_current_user)):
    db = get_db()
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user["id"])
    ).fetchone()
    if not member or member["role"] != "admin":
        db.close()
        raise HTTPException(403, "רק מנהל הקבוצה יכול לערוך")
    if data.name and data.name.strip():
        db.execute("UPDATE groups SET name = ? WHERE id = ?", (data.name.strip(), group_id))
    for name in data.remove_members:
        db.execute("DELETE FROM members WHERE group_id = ? AND name = ?", (group_id, name))
    db.commit()
    row = _group_row(db, group_id, current_user["id"], current_user["name"])
    db.close()
    return row


@router.delete("/groups/{group_id}", status_code=204)
def delete_group(group_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user["id"])
    ).fetchone()
    if not member or member["role"] != "admin":
        db.close()
        raise HTTPException(403, "רק מנהל הקבוצה יכול למחוק")
    db.execute("DELETE FROM groups WHERE id = ?", (group_id,))
    db.commit()
    db.close()


@router.post("/groups/{group_id}/invite-email", status_code=204)
def invite_by_email(group_id: int, data: InviteEmailData, current_user=Depends(get_current_user)):
    db = get_db()
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user["id"])
    ).fetchone()
    if not member or member["role"] != "admin":
        db.close()
        raise HTTPException(403, "רק מנהל הקבוצה יכול להזמין")
    group = db.execute("SELECT name FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        db.close()
        raise HTTPException(404, "Group not found")
    already = db.execute(
        """SELECT m.id FROM members m
           JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? AND LOWER(u.email) = LOWER(?)""",
        (group_id, data.email.strip())
    ).fetchone()
    if already:
        db.close()
        raise HTTPException(400, "משתמש עם אימייל זה כבר חבר בקבוצה")
    db.close()
    send_group_invite(data.email.strip(), group["name"], current_user["name"], data.invite_url)


# ── Events ────────────────────────────────────────────────────────────────────

@router.post("/groups/{group_id}/events", status_code=201)
def create_event(group_id: int, data: EventCreate, current_user=Depends(get_current_user)):
    db = get_db()
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user["id"])
    ).fetchone()
    if not member:
        db.close()
        raise HTTPException(403, "אינך חבר בקבוצה זו")
    if not data.participants:
        db.close()
        raise HTTPException(400, "At least one participant required")
    cursor = db.execute(
        "INSERT INTO events (group_id, name, created_by) VALUES (?, ?, ?)",
        (group_id, data.name.strip(), current_user["name"]),
    )
    event_id = cursor.lastrowid
    for name in data.participants:
        db.execute("INSERT INTO payments (event_id, member_name, amount) VALUES (?, ?, 0)", (event_id, name))
    db.commit()

    group = db.execute("SELECT name FROM groups WHERE id = ?", (group_id,)).fetchone()
    group_name = group["name"] if group else ""
    member_emails = {
        row["name"]: row["email"]
        for row in db.execute(
            """SELECT m.name, COALESCE(u.email, m.email) as email
               FROM members m LEFT JOIN users u ON u.id = m.user_id
               WHERE m.group_id = ?""",
            (group_id,)
        ).fetchall()
    }
    db.close()

    for name in data.participants:
        email = member_emails.get(name, "")
        if email:
            send_event_invitation(email, name, data.name.strip(), group_name)

    db = get_db()
    row = _event_row(db, event_id)
    m = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user["id"])
    ).fetchone()
    row["is_admin"] = bool(m and m["role"] == "admin")
    row["is_event_manager"] = True  # creator always manages their own event
    group_members = db.execute(
        "SELECT name FROM members WHERE group_id = ? ORDER BY id", (group_id,)
    ).fetchall()
    row["group_members"] = [gm["name"] for gm in group_members]
    db.close()
    return row


@router.get("/events/{event_id}")
def get_event(event_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    row = _event_row(db, event_id)
    if not row:
        db.close()
        raise HTTPException(404, "Event not found")
    m = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (row["group_id"], current_user["id"])
    ).fetchone()
    is_group_admin = bool(m and m["role"] == "admin")
    is_event_creator = row["created_by"] == current_user["name"]
    is_event_manager = is_group_admin or is_event_creator
    row["is_admin"] = is_group_admin
    row["is_event_manager"] = is_event_manager
    # Allow access to group admins, event creators, and participants
    if not is_event_manager:
        participant = db.execute(
            "SELECT id FROM payments WHERE event_id = ? AND member_name = ?",
            (event_id, current_user["name"])
        ).fetchone()
        if not participant:
            db.close()
            raise HTTPException(403, "אינך משתתף באירוע זה")
    # Include all group members so event manager can manage participants
    group_members = db.execute(
        "SELECT name FROM members WHERE group_id = ? ORDER BY id",
        (row["group_id"],)
    ).fetchall()
    row["group_members"] = [gm["name"] for gm in group_members]
    db.close()
    return row


@router.put("/events/{event_id}/participants")
def update_participants(event_id: int, data: ParticipantsUpdate, current_user=Depends(get_current_user)):
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        raise HTTPException(404, "Event not found")
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (event["group_id"], current_user["id"])
    ).fetchone()
    is_event_manager = (member and member["role"] == "admin") or event["created_by"] == current_user["name"]
    if not is_event_manager:
        db.close()
        raise HTTPException(403, "רק מנהל האירוע יכול לעדכן משתתפים")
    if not data.participants:
        db.close()
        raise HTTPException(400, "לפחות משתתף אחד נדרש")

    current_set = set(
        r["member_name"]
        for r in db.execute("SELECT member_name FROM payments WHERE event_id = ?", (event_id,)).fetchall()
    )
    new_set = set(p.strip() for p in data.participants if p.strip())

    for name in new_set - current_set:
        db.execute("INSERT INTO payments (event_id, member_name, amount) VALUES (?, ?, 0)", (event_id, name))
    for name in current_set - new_set:
        db.execute("DELETE FROM payments WHERE event_id = ? AND member_name = ?", (event_id, name))
        db.execute(
            "DELETE FROM settlements WHERE event_id = ? AND (from_member = ? OR to_member = ?)",
            (event_id, name, name)
        )

    db.commit()
    row = _event_row(db, event_id)
    row["is_admin"] = bool(member and member["role"] == "admin")
    row["is_event_manager"] = True
    group_members = db.execute(
        "SELECT name FROM members WHERE group_id = ? ORDER BY id",
        (event["group_id"],)
    ).fetchall()
    row["group_members"] = [gm["name"] for gm in group_members]
    db.close()
    return row


@router.patch("/events/{event_id}")
def rename_event(event_id: int, data: EventRename, current_user=Depends(get_current_user)):
    if not data.name.strip():
        raise HTTPException(400, "Event name required")
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        raise HTTPException(404, "Event not found")
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (event["group_id"], current_user["id"])
    ).fetchone()
    is_event_manager = (member and member["role"] == "admin") or event["created_by"] == current_user["name"]
    if not is_event_manager:
        db.close()
        raise HTTPException(403, "רק מנהל האירוע יכול לשנות שם")
    db.execute("UPDATE events SET name = ? WHERE id = ?", (data.name.strip(), event_id))
    db.commit()
    row = _event_row(db, event_id)
    row["is_admin"] = bool(member and member["role"] == "admin")
    row["is_event_manager"] = True
    group_members = db.execute(
        "SELECT name FROM members WHERE group_id = ? ORDER BY id",
        (event["group_id"],)
    ).fetchall()
    row["group_members"] = [gm["name"] for gm in group_members]
    db.close()
    return row


@router.put("/events/{event_id}/payments")
def update_payments(event_id: int, data: PaymentUpdate, current_user=Depends(get_current_user)):
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        raise HTTPException(404, "Event not found")
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (event["group_id"], current_user["id"])
    ).fetchone()
    if not member:
        db.close()
        raise HTTPException(403, "אינך חבר בקבוצה זו")
    is_admin = member["role"] == "admin"
    for p in data.payments:
        if not is_admin and p["member_name"] != current_user["name"]:
            continue  # Non-admin can only update their own payment
        db.execute("UPDATE payments SET amount = ? WHERE event_id = ? AND member_name = ?",
                   (p["amount"], event_id, p["member_name"]))
    db.commit()
    db.close()
    return {"ok": True}


@router.post("/events/{event_id}/settle")
def settle_event(event_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        raise HTTPException(404, "Event not found")
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (event["group_id"], current_user["id"])
    ).fetchone()
    is_event_manager = (member and member["role"] == "admin") or event["created_by"] == current_user["name"]
    if not is_event_manager:
        db.close()
        raise HTTPException(403, "רק מנהל האירוע יכול לחשב")

    payments = db.execute("SELECT member_name, amount FROM payments WHERE event_id = ?", (event_id,)).fetchall()
    payment_dict = {p["member_name"]: p["amount"] for p in payments}

    total = sum(payment_dict.values())
    n = len(payment_dict)
    fair_share = total / n if n else 0
    transactions = calculate_settlements(payment_dict)

    db.execute("DELETE FROM settlements WHERE event_id = ?", (event_id,))
    for t in transactions:
        db.execute("INSERT INTO settlements (event_id, from_member, to_member, amount) VALUES (?, ?, ?, ?)",
                   (event_id, t["from"], t["to"], t["amount"]))
    if not transactions:
        db.execute("UPDATE events SET status = 'completed' WHERE id = ?", (event_id,))
    db.commit()

    saved = db.execute(
        "SELECT id, from_member, to_member, amount, status FROM settlements WHERE event_id = ? ORDER BY id", (event_id,)
    ).fetchall()

    group_id = event["group_id"]
    member_emails = {
        row["name"]: row["email"]
        for row in db.execute(
            """SELECT m.name, COALESCE(u.email, m.email) as email
               FROM members m LEFT JOIN users u ON u.id = m.user_id
               WHERE m.group_id = ?""",
            (group_id,)
        ).fetchall()
    }
    db.close()

    result_transactions = [
        {"id": s["id"], "from": s["from_member"], "to": s["to_member"], "amount": s["amount"], "status": s["status"]}
        for s in saved
    ]

    for name in payment_dict:
        email = member_emails.get(name, "")
        if email:
            send_settlement_summary(email, name, event["name"], result_transactions, member_emails)

    return {
        "total": round(total, 2),
        "fair_share": round(fair_share, 2),
        "payments": [{"member_name": k, "amount": v} for k, v in payment_dict.items()],
        "transactions": result_transactions,
    }


@router.post("/events/{event_id}/settlements/{settlement_id}/done")
def mark_settlement_done(event_id: int, settlement_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    s = db.execute("SELECT * FROM settlements WHERE id = ? AND event_id = ?", (settlement_id, event_id)).fetchone()
    if not s:
        db.close()
        raise HTTPException(404, "Settlement not found")
    if s["from_member"] != current_user["name"]:
        db.close()
        raise HTTPException(403, "You can only mark your own transfers as done")
    db.execute("UPDATE settlements SET status = 'done' WHERE id = ?", (settlement_id,))
    pending = db.execute(
        "SELECT COUNT(*) as cnt FROM settlements WHERE event_id = ? AND status = 'pending'", (event_id,)
    ).fetchone()["cnt"]
    if pending == 0:
        db.execute("UPDATE events SET status = 'completed' WHERE id = ?", (event_id,))
    db.commit()
    row = _event_row(db, event_id)
    m = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (row["group_id"], current_user["id"])
    ).fetchone()
    row["is_admin"] = bool(m and m["role"] == "admin")
    group_members = db.execute(
        "SELECT name FROM members WHERE group_id = ? ORDER BY id",
        (row["group_id"],)
    ).fetchall()
    row["group_members"] = [gm["name"] for gm in group_members]
    db.close()
    return row


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    event = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        db.close()
        raise HTTPException(404, "Event not found")
    member = db.execute(
        "SELECT role FROM members WHERE group_id = ? AND user_id = ?",
        (event["group_id"], current_user["id"])
    ).fetchone()
    if not member or member["role"] != "admin":
        db.close()
        raise HTTPException(403, "רק מנהל הקבוצה יכול למחוק אירועים")
    db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    db.commit()
    db.close()


# ── Member Dashboard ──────────────────────────────────────────────────────────

@router.get("/users/me/dashboard")
def dashboard(current_user=Depends(get_current_user)):
    name = current_user["name"]
    db = get_db()

    rows = db.execute("""
        SELECT
            e.id AS event_id, e.name AS event_name, e.status AS event_status, e.created_at,
            g.id AS group_id, g.name AS group_name,
            p.amount AS my_payment,
            (SELECT SUM(p2.amount) FROM payments p2 WHERE p2.event_id = e.id) AS total_paid,
            (SELECT COUNT(*) FROM payments p2 WHERE p2.event_id = e.id) AS participant_count
        FROM payments p
        JOIN events e ON e.id = p.event_id
        JOIN groups g ON g.id = e.group_id
        WHERE p.member_name = ?
        ORDER BY e.created_at DESC
    """, (name,)).fetchall()

    events = []
    total_paid = 0
    total_owe = 0
    total_owed_to_me = 0

    for r in rows:
        fair_share = round(r["total_paid"] / r["participant_count"], 2) if r["participant_count"] else 0
        my_payment = r["my_payment"] or 0
        total_paid += my_payment

        settlements = db.execute("""
            SELECT id, from_member, to_member, amount, status
            FROM settlements WHERE event_id = ? AND (from_member = ? OR to_member = ?)
        """, (r["event_id"], name, name)).fetchall()

        my_settlements = []
        for s in settlements:
            my_settlements.append({
                "id": s["id"], "from": s["from_member"], "to": s["to_member"],
                "amount": s["amount"], "status": s["status"],
            })
            if s["from_member"] == name and s["status"] == "pending":
                total_owe += s["amount"]
            elif s["to_member"] == name and s["status"] == "pending":
                total_owed_to_me += s["amount"]

        events.append({
            "event_id": r["event_id"],
            "event_name": r["event_name"],
            "event_status": r["event_status"],
            "created_at": r["created_at"],
            "group_id": r["group_id"],
            "group_name": r["group_name"],
            "my_payment": my_payment,
            "fair_share": fair_share,
            "total_paid": r["total_paid"],
            "participant_count": r["participant_count"],
            "my_settlements": my_settlements,
        })

    db.close()
    return {
        "user": current_user,
        "stats": {
            "total_paid": round(total_paid, 2),
            "total_owe": round(total_owe, 2),
            "total_owed_to_me": round(total_owed_to_me, 2),
            "net": round(total_owed_to_me - total_owe, 2),
        },
        "events": events,
    }


# ── Wire up router & serve frontend ──────────────────────────────────────────

app.include_router(router)

# Serve the built React frontend — only present after `npm run build`
_frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(_frontend_dist):
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        index = os.path.join(_frontend_dist, "index.html")
        return FileResponse(index)
