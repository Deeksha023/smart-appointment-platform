-- Smart Appointment Platform - SQLite Database Schema
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'admin')) DEFAULT 'user',
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Appointment Slots Table
CREATE TABLE IF NOT EXISTS appointment_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'General Consultation',
    description TEXT,
    date TEXT NOT NULL,               -- Format: YYYY-MM-DD
    start_time TEXT NOT NULL,         -- Format: HH:MM
    end_time TEXT NOT NULL,           -- Format: HH:MM
    is_available INTEGER NOT NULL DEFAULT 1 CHECK(is_available IN (0, 1)),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(date, start_time)
);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_reference TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES appointment_slots(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL CHECK(status IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed',
    cancellation_reason TEXT,
    cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_slots_date ON appointment_slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_availability ON appointment_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
