import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATABASE_DIR = os.path.join(BASE_DIR, "database")
os.makedirs(DATABASE_DIR, exist_ok=True)

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "smart-appointment-jwt-super-secret-key-2026")
    DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join(DATABASE_DIR, "smart_appointments.db"))
    SCHEMA_PATH = os.path.join(DATABASE_DIR, "schema.sql")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", 24))
    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1")
