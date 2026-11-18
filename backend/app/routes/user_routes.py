from datetime import datetime
from flask import Blueprint, request, jsonify
from ..database import get_db, row_to_dict, rows_to_list
from ..middleware import token_required

user_bp = Blueprint("user", __name__, url_prefix="/api/user")

@user_bp.route("/stats", methods=["GET"])
@token_required
def get_user_dashboard_stats():
    """Retrieve user-specific dashboard statistics and recent activity."""
    user_id = request.current_user["id"]
    today_str = datetime.now().strftime("%Y-%m-%d")
    current_time_str = datetime.now().strftime("%H:%M")

    with get_db() as conn:
        # Total appointments
        total_count = conn.execute(
            "SELECT COUNT(*) FROM appointments WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

        # Cancelled count
        cancelled_count = conn.execute(
            "SELECT COUNT(*) FROM appointments WHERE user_id = ? AND status = 'cancelled'",
            (user_id,)
        ).fetchone()[0]

        # Completed count
        completed_count = conn.execute(
            "SELECT COUNT(*) FROM appointments WHERE user_id = ? AND status = 'completed'",
            (user_id,)
        ).fetchone()[0]

        # Confirmed count
        confirmed_count = conn.execute(
            "SELECT COUNT(*) FROM appointments WHERE user_id = ? AND status = 'confirmed'",
            (user_id,)
        ).fetchone()[0]

        # Upcoming: confirmed and slot is in the future
        upcoming_count = conn.execute(
            """
            SELECT COUNT(*) 
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            WHERE a.user_id = ? 
              AND a.status = 'confirmed'
              AND (s.date > ? OR (s.date = ? AND s.end_time >= ?))
            """,
            (user_id, today_str, today_str, current_time_str)
        ).fetchone()[0]

        # Next closest upcoming appointment
        next_upcoming_row = conn.execute(
            """
            SELECT a.*, 
                   s.title AS slot_title, s.description AS slot_description, 
                   s.date AS slot_date, s.start_time, s.end_time
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            WHERE a.user_id = ? 
              AND a.status = 'confirmed'
              AND (s.date > ? OR (s.date = ? AND s.end_time >= ?))
            ORDER BY s.date ASC, s.start_time ASC
            LIMIT 1
            """,
            (user_id, today_str, today_str, current_time_str)
        ).fetchone()

        # Recent 5 bookings
        recent_rows = conn.execute(
            """
            SELECT a.*, 
                   s.title AS slot_title, s.description AS slot_description, 
                   s.date AS slot_date, s.start_time, s.end_time
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
            LIMIT 5
            """,
            (user_id,)
        ).fetchall()

    return jsonify({
        "success": True,
        "data": {
            "metrics": {
                "total": total_count,
                "upcoming": upcoming_count,
                "confirmed": confirmed_count,
                "completed": completed_count,
                "cancelled": cancelled_count
            },
            "next_upcoming": row_to_dict(next_upcoming_row),
            "recent_activity": rows_to_list(recent_rows)
        }
    }), 200
