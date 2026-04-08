from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

SECRET_KEY = os.getenv("SECRET_KEY", "splitsmart-dev-secret-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except JWTError:
        raise ValueError("Invalid or expired token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    from database import get_db
    if not credentials:
        raise HTTPException(401, "Authentication required")
    try:
        user_id = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(401, "Invalid or expired token")
    db = get_db()
    user = db.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    if not user:
        raise HTTPException(401, "User not found")
    return dict(user)


def optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    """Returns user dict or None — for endpoints that work with or without auth."""
    if not credentials:
        return None
    from database import get_db
    try:
        user_id = decode_token(credentials.credentials)
    except ValueError:
        return None
    db = get_db()
    user = db.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    return dict(user) if user else None
