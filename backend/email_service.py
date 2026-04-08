import os
import resend

SENDER = "SplitSmart <noreply@splitsmrt.com>"


def _send(to: str, subject: str, body: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        print("[email] skipped — RESEND_API_KEY not set in .env")
        return False
    if not to:
        return False
    resend.api_key = api_key
    try:
        resend.Emails.send({
            "from": SENDER,
            "to": [to],
            "subject": subject,
            "text": body,
        })
        print(f"[email] sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[email] FAILED to {to}: {e}")
        return False


def send_event_invitation(to_email: str, member_name: str, event_name: str, group_name: str):
    if not to_email:
        return
    _send(
        to=to_email,
        subject=f"הוזמנת לאירוע {event_name}!",
        body=(
            f"שלום {member_name},\n\n"
            f'הוזמנת לאירוע "{event_name}" בקבוצה "{group_name}"!\n'
            f"הכנס לאפליקציה והזן את הסכום שהוצאת.\n\n"
            f"SplitSmart"
        ),
    )


def send_group_invite(to_email: str, group_name: str, inviter_name: str, invite_url: str):
    _send(
        to=to_email,
        subject=f"הוזמנת להצטרף לקבוצה {group_name}!",
        body=(
            f"שלום,\n\n"
            f"{inviter_name} מזמין אותך להצטרף לקבוצה \"{group_name}\" ב-SplitSmart.\n\n"
            f"לחץ על הקישור כדי להצטרף:\n{invite_url}\n\n"
            f"אם אין לך חשבון עדיין, תצטרך להירשם תחילה.\n\n"
            f"SplitSmart"
        ),
    )


def send_settlement_summary(
    to_email: str,
    member_name: str,
    event_name: str,
    transactions: list,
    member_emails: dict,
):
    if not to_email:
        return
    lines = []
    for t in transactions:
        if t["from"] == member_name:
            recipient_email = member_emails.get(t["to"], "")
            line = f"• {t['amount']:.0f}₪ ל{t['to']}"
            if recipient_email:
                line += f" ({recipient_email})"
            lines.append(line)
    if not lines:
        return  # This person owes nothing — skip
    body = (
        f"שלום {member_name},\n\n"
        f'סיכום אירוע "{event_name}":\n'
        f"עליך להעביר:\n"
        + "\n".join(lines)
        + "\n\nSplitSmart"
    )
    _send(to=to_email, subject=f"סיכום אירוע {event_name}", body=body)
