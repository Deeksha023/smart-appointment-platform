from datetime import datetime
from flask import Blueprint, request, jsonify
from ..database import get_db, get_db_connection, row_to_dict, rows_to_list
from ..middleware import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    """Return comprehensive system statistics for the admin dashboard."""
    with get_db() as conn:
        total_users = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        total_appointments = conn.execute("SELECT COUNT(*) FROM appointments").fetchone()[0]
        confirmed_appointments = conn.execute("SELECT COUNT(*) FROM appointments WHERE status = 'confirmed'").fetchone()[0]
        cancelled_appointments = conn.execute("SELECT COUNT(*) FROM appointments WHERE status = 'cancelled'").fetchone()[0]
        completed_appointments = conn.execute("SELECT COUNT(*) FROM appointments WHERE status = 'completed'").fetchone()[0]

        total_slots = conn.execute("SELECT COUNT(*) FROM appointment_slots").fetchone()[0]
        available_slots = conn.execute("SELECT COUNT(*) FROM appointment_slots WHERE is_available = 1").fetchone()[0]
        booked_slots = conn.execute("SELECT COUNT(*) FROM appointment_slots WHERE is_available = 0").fetchone()[0]

        # Recent 5 bookings
        recent_rows = conn.execute(
            """
            SELECT a.id, a.booking_reference, a.status, a.reason, a.created_at,
                   u.name AS user_name, u.email AS user_email,
                   s.title AS slot_title, s.date AS slot_date, s.start_time, s.end_time
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            JOIN appointment_slots s ON a.slot_id = s.id
            ORDER BY a.created_at DESC
            LIMIT 7
            """
        ).fetchall()
        recent_bookings = rows_to_list(recent_rows)

        # Status breakdown for charts
        status_breakdown = [
            {"name": "Confirmed", "value": confirmed_appointments, "color": "#10b981"},
            {"name": "Completed", "value": completed_appointments, "color": "#6366f1"},
            {"name": "Cancelled", "value": cancelled_appointments, "color": "#ef4444"}
        ]

        # Monthly / weekly booking distribution
        timeline_rows = conn.execute(
            """
            SELECT date(created_at) AS booking_date, COUNT(*) as count
            FROM appointments
            GROUP BY date(created_at)
            ORDER BY booking_date DESC
            LIMIT 7
            """
        ).fetchall()
        timeline = [{"date": r["booking_date"], "count": r["count"]} for r in timeline_rows]

    return jsonify({
        "success": True,
        "data": {
            "metrics": {
                "total_users": total_users,
                "total_appointments": total_appointments,
                "confirmed_appointments": confirmed_appointments,
                "cancelled_appointments": cancelled_appointments,
                "completed_appointments": completed_appointments,
                "total_slots": total_slots,
                "available_slots": available_slots,
                "booked_slots": booked_slots
            },
            "status_breakdown": status_breakdown,
            "timeline": timeline,
            "recent_bookings": recent_bookings
        }
    }), 200

@admin_bp.route("/bookings", methods=["GET"])
@admin_required
def get_all_bookings():
    """Retrieve all bookings with optional search and filters for the admin table."""
    status_filter = request.args.get("status")
    date_filter = request.args.get("date")
    search_query = request.args.get("search", "").strip()

    query = """
        SELECT a.*, 
               u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
               s.title AS slot_title, s.description AS slot_description, 
               s.date AS slot_date, s.start_time, s.end_time,
               cb.name AS cancelled_by_name
        FROM appointments a
        JOIN users u ON a.user_id = u.id
        JOIN appointment_slots s ON a.slot_id = s.id
        LEFT JOIN users cb ON a.cancelled_by = cb.id
        WHERE 1=1
    """
    params = []

    if status_filter and status_filter.lower() != "all":
        query += " AND a.status = ?"
        params.append(status_filter.lower())

    if date_filter:
        query += " AND s.date = ?"
        params.append(date_filter)

    if search_query:
        query += """ AND (
            u.name LIKE ? OR 
            u.email LIKE ? OR 
            a.booking_reference LIKE ? OR 
            s.title LIKE ? OR 
            a.reason LIKE ?
        )"""
        like_term = f"%{search_query}%"
        params.extend([like_term, like_term, like_term, like_term, like_term])

    query += " ORDER BY s.date DESC, s.start_time DESC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        bookings = rows_to_list(rows)

    now = datetime.now()
    for b in bookings:
        try:
            slot_end = datetime.strptime(f"{b['slot_date']} {b['end_time']}", "%Y-%m-%d %H:%M")
            b["is_past"] = slot_end < now
        except Exception:
            b["is_past"] = False

    return jsonify({
        "success": True,
        "count": len(bookings),
        "data": bookings
    }), 200

@admin_bp.route("/bookings/<int:booking_id>/status", methods=["PUT"])
@admin_required
def update_booking_status(booking_id):
    """
    Update booking status to 'confirmed', 'completed', or 'cancelled'.
    Maintains slot availability integrity.
    """
    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()
    reason = data.get("reason", "Status updated by admin").strip()

    if new_status not in ("confirmed", "completed", "cancelled"):
        return jsonify({
            "success": False,
            "message": "Invalid status. Allowed values: confirmed, completed, cancelled."
        }), 400

    conn = get_db_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")

        appt = conn.execute(
            """
            SELECT a.*, s.date AS slot_date, s.start_time, s.end_time, s.id AS slot_id
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            WHERE a.id = ?
            """,
            (booking_id,)
        ).fetchone()

        if not appt:
            conn.rollback()
            return jsonify({"success": False, "message": "Booking not found."}), 404

        old_status = appt["status"]
        if old_status == new_status:
            conn.rollback()
            return jsonify({"success": True, "message": f"Booking is already in '{new_status}' status."}), 200

        # Handle transitions:
        if new_status == "cancelled":
            conn.execute(
                """
                UPDATE appointments
                SET status = 'cancelled', 
                    cancellation_reason = ?, 
                    cancelled_by = ?, 
                    cancelled_at = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (reason, request.current_user["id"], booking_id)
            )

            # Reopen slot if slot is in the future
            try:
                slot_dt = datetime.strptime(f"{appt['slot_date']} {appt['start_time']}", "%Y-%m-%d %H:%M")
                if slot_dt >= datetime.now():
                    conn.execute(
                        "UPDATE appointment_slots SET is_available = 1, updated_at = datetime('now') WHERE id = ?",
                        (appt["slot_id"],)
                    )
            except Exception:
                pass

        elif new_status == "completed":
            conn.execute(
                """
                UPDATE appointments
                SET status = 'completed', updated_at = datetime('now')
                WHERE id = ?
                """,
                (booking_id,)
            )

        elif new_status == "confirmed":
            # Re-confirming a cancelled appointment requires checking slot availability
            if old_status == "cancelled":
                slot = conn.execute("SELECT is_available FROM appointment_slots WHERE id = ?", (appt["slot_id"],)).fetchone()
                if not slot or slot["is_available"] != 1:
                    conn.rollback()
                    return jsonify({
                        "success": False,
                        "message": "Cannot re-confirm: The slot has already been reassigned or booked by someone else."
                    }), 409

                conn.execute(
                    "UPDATE appointment_slots SET is_available = 0, updated_at = datetime('now') WHERE id = ?",
                    (appt["slot_id"],)
                )

            conn.execute(
                """
                UPDATE appointments
                SET status = 'confirmed', cancellation_reason = NULL, cancelled_by = NULL, cancelled_at = NULL, updated_at = datetime('now')
                WHERE id = ?
                """,
                (booking_id,)
            )

        conn.commit()

        updated_row = conn.execute(
            """
            SELECT a.*, 
                   u.name AS user_name, u.email AS user_email,
                   s.title AS slot_title, s.date AS slot_date, s.start_time, s.end_time
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            JOIN appointment_slots s ON a.slot_id = s.id
            WHERE a.id = ?
            """,
            (booking_id,)
        ).fetchone()

        return jsonify({
            "success": True,
            "message": f"Booking status successfully changed to {new_status}.",
            "data": row_to_dict(updated_row)
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Error updating booking: {str(e)}"}), 500
    finally:
        conn.close()

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_all_users():
    """Retrieve list of registered users and their booking statistics."""
    query = """
        SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
               COUNT(a.id) AS total_bookings,
               SUM(CASE WHEN a.status = 'confirmed' THEN 1 ELSE 0 END) AS active_bookings,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
               SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings
        FROM users u
        LEFT JOIN appointments a ON u.id = a.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """
    with get_db() as conn:
        rows = conn.execute(query).fetchall()
        users = rows_to_list(rows)

    return jsonify({
        "success": True,
        "count": len(users),
        "data": users
    }), 200
