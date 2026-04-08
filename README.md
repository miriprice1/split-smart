# SplitSmart 💸

A smart expense-splitting app for groups. Create a group, invite friends via link or email, enter what each person spent, and get the minimum number of transfers needed to settle everything.

---

## Features

- **Group management** — create groups, share an invite link or send email invitations; members join with their own account
- **Events** — create expense events within a group, select which members participate
- **Smart settlement** — algorithm minimizes the number of transfers needed to balance all debts
- **Role-based access** — group admin can manage members and edit all amounts; regular members can only enter their own spending
- **Settlement tracking** — each member marks their own transfers as done; event auto-completes when all settled
- **Personal dashboard** — see your total paid, what you owe, and what others owe you across all events
- **Email notifications** — invite emails and settlement summaries via Resend

---

## Tech stack

**Backend**
- Python + FastAPI
- SQLite
- JWT authentication (python-jose)
- bcrypt password hashing
- Resend (email)

**Frontend**
- React 18
- React Router
- Tailwind CSS
- Vite

---

## Local development

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:
```
SECRET_KEY=your-secret-key-here
RESEND_API_KEY=your-resend-api-key   # optional, emails are skipped if not set
```

Start the server:
```bash
uvicorn main:app --reload
```

API runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173` — the Vite dev server proxies `/api` to the backend automatically.

---

## Deployment (Render)

The repo includes a `render.yaml` for one-click deployment on [Render](https://render.com).

1. Push to GitHub
2. Connect the repo on Render → it detects `render.yaml` automatically
3. Add `RESEND_API_KEY` manually in the Render dashboard
4. Update `ALLOWED_ORIGINS` to your Render app URL after the first deploy

The build command compiles the React frontend, and FastAPI serves it as static files alongside the API. The SQLite database is stored on a persistent Render Disk.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `RESEND_API_KEY` | No | Resend API key for email notifications |
| `ALLOWED_ORIGINS` | Prod | Comma-separated allowed CORS origins (e.g. `https://splitsmart.onrender.com`) |
| `DB_PATH` | Prod | Path to SQLite file (e.g. `/data/splitsmart.db` on Render) |
