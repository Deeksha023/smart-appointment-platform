from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from .database import get_db, init_db

def seed_database():
    """Seed the database with initial users, slots, and demo appointments."""
    init_db()

    with get_db() as conn:
        # Check if already seeded
        admin_check = conn.execute("SELECT id FROM users WHERE email = 'admin@smartapp.com'").fetchone()
        if admin_check:
            print("Database already contains seed data.")
            return

        print("Seeding database...")

        # 1. Create Users
        admin_pass = generate_password_hash("Admin@123")
        user_pass = generate_password_hash("User@123")

        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, role, phone)
            VALUES (?, ?, ?, ?, ?)
            """,
            ("System Administrator", "admin@smartapp.com", admin_pass, "admin", "+1 (555) 019-9000")
        )
        admin_id = cursor.lastrowid

        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, role, phone)
            VALUES (?, ?, ?, ?, ?)
            """,
            ("Alex Morgan", "user@smartapp.com", user_pass, "user", "+1 (555) 014-2233")
        )
        alex_id = cursor.lastrowid

        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, role, phone)
            VALUES (?, ?, ?, ?, ?)
            """,
            ("Sarah Connor", "sarah@smartapp.com", user_pass, "user", "+1 (555) 018-8899")
        )
        sarah_id = cursor.lastrowid

        # 2. Generate Slots (Past day, Today, and next 7 days)
        today = datetime.now().date()
        slot_templates = [
            ("09:00", "09:45", "General Consultation", "Standard one-on-one consultation and advisory session."),
            ("10:00", "10:45", "Technical Review", "Detailed technical assessment, code review, and feedback."),
            ("11:15", "12:00", "Career & Mentorship", "Professional career guidance and internship roadmap discussion."),
            ("13:30", "14:15", "Project Evaluation", "Comprehensive project milestone review and grading."),
            ("14:30", "15:15", "Database Optimization", "Schema evaluation, indexing review, and query tuning."),
            ("15:30", "16:15", "Strategy Planning", "Long-term technical goals and feature prioritization.")
        ]

        slot_ids = []
        # Yesterday (for past completed test records)
        yesterday = today - timedelta(days=1)
        for st, et, title, desc in slot_templates[:2]:
            cur = conn.execute(
                """
                INSERT INTO appointment_slots (title, description, date, start_time, end_time, is_available, created_by)
                VALUES (?, ?, ?, ?, ?, 0, ?)
                """,
                (title, desc, yesterday.strftime("%Y-%m-%d"), st, et, admin_id)
            )
            slot_ids.append((yesterday.strftime("%Y-%m-%d"), st, cur.lastrowid, False))

        # Today and Next 7 Days
        for day_offset in range(0, 8):
            target_date = today + timedelta(days=day_offset)
            date_str = target_date.strftime("%Y-%m-%d")
            for st, et, title, desc in slot_templates:
                cur = conn.execute(
                    """
                    INSERT INTO appointment_slots (title, description, date, start_time, end_time, is_available, created_by)
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                    """,
                    (title, desc, date_str, st, et, admin_id)
                )
                slot_ids.append((date_str, st, cur.lastrowid, True))

        # 3. Seed demo appointments
        # Past completed appointment for Alex
        past_slot_id = slot_ids[0][2]
        conn.execute(
            """
            INSERT INTO appointments (booking_reference, user_id, slot_id, reason, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'completed', datetime('now', '-2 days'))
            """,
            ("SAP-HIST-001", alex_id, past_slot_id, "Preliminary orientation session", "Completed successfully with all onboarding notes passed.")
        )

        # Future confirmed appointment for Alex (Day + 1 at 10:00)
        future_slot = None
        for d, st, s_id, avail in slot_ids:
            if d == (today + timedelta(days=1)).strftime("%Y-%m-%d") and st == "10:00":
                future_slot = s_id
                break

        if future_slot:
            conn.execute(
                """
                INSERT INTO appointments (booking_reference, user_id, slot_id, reason, notes, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'confirmed', datetime('now'))
                """,
                ("SAP-CONF-101", alex_id, future_slot, "Technical assessment demo and live code walkthrough", "Prepared slides and demo database.")
            )
            # Mark that slot as booked (is_available = 0)
            conn.execute("UPDATE appointment_slots SET is_available = 0 WHERE id = ?", (future_slot,))

        # Cancelled appointment for Sarah Connor (Day + 2 at 11:15)
        cancel_slot = None
        for d, st, s_id, avail in slot_ids:
            if d == (today + timedelta(days=2)).strftime("%Y-%m-%d") and st == "11:15":
                cancel_slot = s_id
                break

        if cancel_slot:
            conn.execute(
                """
                INSERT INTO appointments (booking_reference, user_id, slot_id, reason, notes, status, cancellation_reason, cancelled_by, cancelled_at)
                VALUES (?, ?, ?, ?, ?, 'cancelled', 'Schedule conflict with university exam', ?, datetime('now'))
                """,
                ("SAP-CANC-202", sarah_id, cancel_slot, "Internship mentorship session", "Rescheduling needed.", sarah_id)
            )
            # Slot remains available (is_available = 1) because it was cancelled!

        print("Database seeded successfully with demo users, slots, and bookings.")

if __name__ == "__main__":
    seed_database()
