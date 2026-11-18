import os
import random
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from app.database import get_db, init_db

def populate_rich_data():
    print("Populating database with rich, realistic dashboard data...")
    init_db()

    with get_db() as conn:
        # Clear existing bookings and slots to start with a pristine, beautiful dataset
        conn.execute("DELETE FROM appointments")
        conn.execute("DELETE FROM appointment_slots")
        conn.execute("DELETE FROM users")

        user_pw = generate_password_hash("User@123")
        admin_pw = generate_password_hash("Admin@123")

        # 1. Create realistic users
        users_data = [
            ("System Administrator", "admin@smartapp.com", admin_pw, "admin", "+1 (555) 019-9000"),
            ("Alex Morgan", "user@smartapp.com", user_pw, "user", "+1 (555) 014-2233"),
            ("Sarah Connor", "sarah@smartapp.com", user_pw, "user", "+1 (555) 018-8899"),
            ("Michael Chen", "michael.chen@smartapp.com", user_pw, "user", "+1 (555) 012-7744"),
            ("Emily Watson", "emily.watson@smartapp.com", user_pw, "user", "+1 (555) 016-3322"),
            ("Robert Johnson", "robert.j@smartapp.com", user_pw, "user", "+1 (555) 013-5566"),
            ("Priya Sharma", "priya.sharma@smartapp.com", user_pw, "user", "+1 (555) 017-9911")
        ]

        user_ids = {}
        for name, email, pw, role, phone in users_data:
            cur = conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role, phone)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email, pw, role, phone)
            )
            user_ids[email] = cur.lastrowid

        admin_id = user_ids["admin@smartapp.com"]
        alex_id = user_ids["user@smartapp.com"]

        # 2. Slot Templates across dates
        today = datetime.now().date()
        slot_templates = [
            ("09:00", "09:45", "General Consultation", "Standard one-on-one advisory and clinical/consulting session."),
            ("10:00", "10:45", "Technical Review", "Detailed technical architecture and code assessment."),
            ("11:15", "12:00", "Career & Mentorship", "Professional career guidance and internship roadmap discussion."),
            ("13:30", "14:15", "Project Evaluation", "Milestone review, rubric scoring, and project feedback."),
            ("14:30", "15:15", "Database Optimization", "Schema evaluation, indexing review, and query tuning."),
            ("15:30", "16:15", "Strategy Planning", "Long-term goals, milestone planning, and feature prioritization."),
            ("16:30", "17:15", "Executive Briefing", "High-level summary, executive assessment, and closing review.")
        ]

        # Generate slots from 5 days ago to 10 days in future
        all_slots = {}  # key: (date_str, start_time) -> slot_id
        for day_offset in range(-5, 11):
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
                all_slots[(date_str, st)] = {
                    "id": cur.lastrowid,
                    "date": date_str,
                    "start_time": st,
                    "title": title
                }

        # 3. Create rich, varied Appointments
        # Helper to book a slot
        def book_slot(user_email, date_offset, start_time, status, reason, notes=None, cancel_reason=None):
            u_id = user_ids[user_email]
            target_date = (today + timedelta(days=date_offset)).strftime("%Y-%m-%d")
            slot_info = all_slots.get((target_date, start_time))
            if not slot_info:
                return

            s_id = slot_info["id"]
            ref = f"SAP-{target_date.replace('-', '')}-{random.randint(1000, 9999)}"

            # Created timestamp relative to date
            created_days_ago = max(1, abs(date_offset) + 2)
            created_ts = (datetime.now() - timedelta(days=created_days_ago, hours=random.randint(1, 8))).strftime("%Y-%m-%d %H:%M:%S")

            cancelled_by = u_id if status == "cancelled" else None
            cancelled_at = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S") if status == "cancelled" else None

            conn.execute(
                """
                INSERT INTO appointments (booking_reference, user_id, slot_id, reason, notes, status, cancellation_reason, cancelled_by, cancelled_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (ref, u_id, s_id, reason, notes, status, cancel_reason, cancelled_by, cancelled_at, created_ts)
            )

            # Slot availability: 0 if confirmed or completed past; 1 if cancelled
            if status == "confirmed":
                conn.execute("UPDATE appointment_slots SET is_available = 0 WHERE id = ?", (s_id,))
            elif status == "completed":
                conn.execute("UPDATE appointment_slots SET is_available = 0 WHERE id = ?", (s_id,))
            elif status == "cancelled":
                # slot remains or re-opened to 1
                conn.execute("UPDATE appointment_slots SET is_available = 1 WHERE id = ?", (s_id,))

        # ALEX MORGAN'S APPOINTMENTS (The main user)
        # 1. Upcoming Tomorrow (Confirmed)
        book_slot(
            "user@smartapp.com", 1, "10:00", "confirmed",
            "Internship Technical Assessment Live Demo",
            "Presenting full-stack Smart Appointment Platform with Flask and React."
        )
        # 2. Upcoming In 2 Days (Confirmed)
        book_slot(
            "user@smartapp.com", 2, "14:30", "confirmed",
            "Database Indexing & SQLite Transaction Review",
            "Reviewing ACID concurrency control and index optimizations."
        )
        # 3. Upcoming In 4 Days (Confirmed)
        book_slot(
            "user@smartapp.com", 4, "11:15", "confirmed",
            "Career & Post-Internship Roadmap Mentoring",
            "Discussing junior full-stack developer role transition."
        )
        # 4. Completed (2 days ago)
        book_slot(
            "user@smartapp.com", -2, "09:00", "completed",
            "Preliminary Project Architecture Submission",
            "All wireframes and system architecture approved with positive feedback."
        )
        # 5. Completed (4 days ago)
        book_slot(
            "user@smartapp.com", -4, "13:30", "completed",
            "Milestone 1 Code Review & Setup Verification",
            "Environment verification completed without blocking issues."
        )
        # 6. Cancelled (1 day ago)
        book_slot(
            "user@smartapp.com", 3, "15:30", "cancelled",
            "Optional Strategy Session",
            "Rescheduling due to university semester exam.",
            cancel_reason="Schedule conflict with semester examination"
        )

        # SARAH CONNOR'S APPOINTMENTS
        book_slot(
            "sarah@smartapp.com", 1, "13:30", "confirmed",
            "Project Evaluation & Frontend UX Feedback",
            "Reviewing mobile responsiveness and accessibility."
        )
        book_slot(
            "sarah@smartapp.com", 3, "09:00", "confirmed",
            "General Consultation & Weekly Standup",
            "Bi-weekly sync on deliverables."
        )
        book_slot(
            "sarah@smartapp.com", -3, "10:00", "completed",
            "Sprint Milestone 2 Review",
            "Completed successfully on time."
        )
        book_slot(
            "sarah@smartapp.com", 2, "11:15", "cancelled",
            "Mid-term Evaluation Checkpoint",
            "Rescheduled to next week.",
            cancel_reason="Shifted to following Monday"
        )

        # MICHAEL CHEN'S APPOINTMENTS
        book_slot(
            "michael.chen@smartapp.com", 1, "14:30", "confirmed",
            "Database Schema Performance Consultation",
            "Auditing foreign key constraints and index usage."
        )
        book_slot(
            "michael.chen@smartapp.com", 3, "10:00", "confirmed",
            "Backend REST API Security Audit",
            "Reviewing JWT expiration and header parsing."
        )
        book_slot(
            "michael.chen@smartapp.com", -1, "15:30", "completed",
            "Code Quality & CI/CD Pipeline Mentoring",
            "Setup pre-commit hooks and test automation."
        )

        # EMILY WATSON'S APPOINTMENTS
        book_slot(
            "emily.watson@smartapp.com", 2, "09:00", "confirmed",
            "Product Requirements & Feature Prioritization",
            "Defining MVP requirements for candidate portal."
        )
        book_slot(
            "emily.watson@smartapp.com", -2, "11:15", "completed",
            "UI/UX Design Review & Color System Alignment",
            "Approved SaaS navy and royal blue palette."
        )
        book_slot(
            "emily.watson@smartapp.com", 5, "13:30", "cancelled",
            "Quarterly Review",
            "Postponed.",
            cancel_reason="Travel schedule conflict"
        )

        # ROBERT JOHNSON'S APPOINTMENTS
        book_slot(
            "robert.j@smartapp.com", 2, "16:30", "confirmed",
            "Data Analytics & Dashboard Metrics Integration",
            "Reviewing aggregation queries for admin reporting."
        )
        book_slot(
            "robert.j@smartapp.com", -3, "14:30", "completed",
            "SQL Reporting Workshop",
            "Covered SQLite window functions and date grouping."
        )

        # PRIYA SHARMA'S APPOINTMENTS
        book_slot(
            "priya.sharma@smartapp.com", 3, "16:30", "confirmed",
            "Cloud Deployment & Dockerization Session",
            "Packaging Flask and Vite for production."
        )
        book_slot(
            "priya.sharma@smartapp.com", -1, "10:00", "completed",
            "System Architecture & Load Test Advisory",
            "Simulated 100 concurrent slot bookings."
        )

    print("Populated database with 7 users, 112 slots, and 18 diverse appointments across all statuses!")

if __name__ == "__main__":
    populate_rich_data()
