import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "splitsmart.db"))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_by TEXT DEFAULT '',
            invite_code TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT DEFAULT '',
            user_id INTEGER REFERENCES users(id),
            role TEXT DEFAULT 'member'
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            created_by TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            member_name TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            from_member TEXT NOT NULL,
            to_member TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending'
        );
    """)

    # Migrate existing tables — add new columns if they don't exist yet
    migrations = [
        "ALTER TABLE groups ADD COLUMN created_by TEXT DEFAULT ''",
        "ALTER TABLE groups ADD COLUMN invite_code TEXT",
        "ALTER TABLE members ADD COLUMN email TEXT DEFAULT ''",
        "ALTER TABLE members ADD COLUMN user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'member'",
        "ALTER TABLE events ADD COLUMN created_by TEXT DEFAULT ''",
        "ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'active'",
    ]
    for sql in migrations:
        try:
            cursor.execute(sql)
        except Exception:
            pass  # Column already exists

    conn.commit()
    conn.close()
