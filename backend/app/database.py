import sqlite3
import os
from contextlib import contextmanager
from .config import Config

def get_db_connection():
    """Establish and return a SQLite connection with row factory and foreign keys enabled."""
    conn = sqlite3.connect(
        Config.DATABASE_PATH,
        timeout=10.0,
        detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def get_db():
    """Context manager for SQLite connections handling transactions and cleanup."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize the SQLite database with the schema."""
    if not os.path.exists(Config.SCHEMA_PATH):
        raise FileNotFoundError(f"Schema file not found at: {Config.SCHEMA_PATH}")

    with open(Config.SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with get_db() as conn:
        conn.executescript(schema_sql)

def row_to_dict(row):
    """Convert a sqlite3.Row object to a standard Python dict."""
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    """Convert a list of sqlite3.Row objects to a list of dicts."""
    return [dict(row) for row in rows]
