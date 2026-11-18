import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..database import get_db, row_to_dict, rows_to_list
from ..middleware import token_required, admin_required

slot_bp = Blueprint("slots", __name__, url_prefix="/api/slots")

DATE_REGEX = r"^\d{4}-\d{2}-\d{2}$"
TIME_REGEX = r"^\d{2}:\d{2}$"

def is_in_past(date_str, time_str="23:59"):
    """Check if the given date and time is before the current local datetime."""
    try:
        slot_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        return slot_dt < datetime.now()
    except ValueError:
        return True

@slot_bp.route("", methods=["GET"])
def get_slots():
    """Fetch slots with optional filters: date, available_only, include_past."""
    date_filter = request.args.get("date")
    available_only = request.args.get("available_only", "0") in ("1", "true", "True")
    include_past = request.args.get("include_past", "0") in ("1", "true", "True")

    query = """
        SELECT s.*, 
               u.name AS creator_name,
               (SELECT COUNT(*) FROM appointments a WHERE a.slot_id = s.id AND a.status = 'confirmed') AS active_bookings_count
        FROM appointment_slots s
        LEFT JOIN users u ON s.created_by = u.id
        WHERE 1=1
    """
    params = []

    if date_filter:
        query += " AND s.date = ?"
        params.append(date_filter)

    if available_only:
        query += " AND s.is_available = 1"

    query += " ORDER BY s.date ASC, s.start_time ASC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        slots = rows_to_list(rows)

    # Filter out past slots if requested or if available_only is true
    now = datetime.now()
    filtered_slots = []
    for s in slots:
        try:
            slot_end = datetime.strptime(f"{s['date']} {s['end_time']}", "%Y-%m-%d %H:%M")
            s["is_past"] = slot_end < now
        except Exception:
            s["is_past"] = False

        if available_only and s["is_past"]:
            continue
        if not include_past and s["is_past"] and not available_only and not date_filter:
            # Keep for today or future by default unless explicit
            pass

        filtered_slots.append(s)

    return jsonify({
        "success": True,
        "count": len(filtered_slots),
        "data": filtered_slots
    }), 200

@slot_bp.route("/<int:slot_id>", methods=["GET"])
def get_slot_details(slot_id):
    """Fetch details of a specific slot."""
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT s.*, 
                   u.name AS creator_name,
                   (SELECT COUNT(*) FROM appointments a WHERE a.slot_id = s.id AND a.status = 'confirmed') AS active_bookings_count
            FROM appointment_slots s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.id = ?
            """,
            (slot_id,)
        ).fetchone()

    if not row:
        return jsonify({"success": False, "message": "Appointment slot not found."}), 404

    return jsonify({
        "success": True,
        "data": row_to_dict(row)
    }), 200

@slot_bp.route("", methods=["POST"])
@admin_required
def create_slot():
    """Create a new appointment slot or batch slots (Admin only)."""
    data = request.get_json() or {}

    # Check for batch generation
    if "slots" in data and isinstance(data["slots"], list):
        created = []
        errors = []
        with get_db() as conn:
            for item in data["slots"]:
                title = item.get("title", "General Consultation").strip()
                desc = item.get("description", "").strip()
                date_str = item.get("date", "").strip()
                start_time = item.get("start_time", "").strip()
                end_time = item.get("end_time", "").strip()

                if not date_str or not start_time or not end_time:
                    errors.append(f"Missing fields for slot on {date_str} at {start_time}")
                    continue

                if is_in_past(date_str, start_time):
                    errors.append(f"Cannot create slot in the past: {date_str} {start_time}")
                    continue

                try:
                    cursor = conn.execute(
                        """
                        INSERT INTO appointment_slots (title, description, date, start_time, end_time, is_available, created_by)
                        VALUES (?, ?, ?, ?, ?, 1, ?)
                        """,
                        (title, desc or None, date_str, start_time, end_time, request.current_user["id"])
                    )
                    created.append(cursor.lastrowid)
                except Exception as e:
                    errors.append(f"Failed to create slot on {date_str} at {start_time}: {str(e)}")

        return jsonify({
            "success": len(created) > 0,
            "message": f"Created {len(created)} slots." + (f" {len(errors)} errors occurred." if errors else ""),
            "created_count": len(created),
            "errors": errors
        }), 201 if len(created) > 0 else 400

    # Single slot creation
    title = data.get("title", "General Consultation").strip()
    description = data.get("description", "").strip()
    date_str = data.get("date", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()

    if not title:
        return jsonify({"success": False, "message": "Slot title is required."}), 400

    if not date_str or not re.match(DATE_REGEX, date_str):
        return jsonify({"success": False, "message": "Valid date (YYYY-MM-DD) is required."}), 400

    if not start_time or not re.match(TIME_REGEX, start_time):
        return jsonify({"success": False, "message": "Valid start time (HH:MM) is required."}), 400

    if not end_time or not re.match(TIME_REGEX, end_time):
        return jsonify({"success": False, "message": "Valid end time (HH:MM) is required."}), 400

    if start_time >= end_time:
        return jsonify({"success": False, "message": "Start time must be before end time."}), 400

    if is_in_past(date_str, start_time):
        return jsonify({"success": False, "message": "Cannot create an appointment slot in the past."}), 400

    try:
        with get_db() as conn:
            # Check duplicate slot
            existing = conn.execute(
                "SELECT id FROM appointment_slots WHERE date = ? AND start_time = ?",
                (date_str, start_time)
            ).fetchone()

            if existing:
                return jsonify({
                    "success": False,
                    "message": f"A slot already exists on {date_str} at {start_time}."
                }), 409

            cursor = conn.execute(
                """
                INSERT INTO appointment_slots (title, description, date, start_time, end_time, is_available, created_by)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                """,
                (title, description or None, date_str, start_time, end_time, request.current_user["id"])
            )
            slot_id = cursor.lastrowid
            created_slot = conn.execute("SELECT * FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone()

        return jsonify({
            "success": True,
            "message": "Appointment slot created successfully.",
            "data": row_to_dict(created_slot)
        }), 201

    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to create slot: {str(e)}"}), 500

@slot_bp.route("/<int:slot_id>", methods=["PUT"])
@admin_required
def update_slot(slot_id):
    """Edit an existing appointment slot (Admin only)."""
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    date_str = data.get("date", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    is_available = data.get("is_available")

    with get_db() as conn:
        slot = conn.execute("SELECT * FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone()
        if not slot:
            return jsonify({"success": False, "message": "Appointment slot not found."}), 404

        # Check if slot has active confirmed booking
        active_booking = conn.execute(
            "SELECT id FROM appointments WHERE slot_id = ? AND status = 'confirmed'",
            (slot_id,)
        ).fetchone()

        # If date or time is being changed and there's an active booking, reject
        if active_booking and (
            (date_str and date_str != slot["date"]) or 
            (start_time and start_time != slot["start_time"])
        ):
            return jsonify({
                "success": False,
                "message": "Cannot modify date or time of a slot with an active confirmed booking."
            }), 400

        new_title = title if title else slot["title"]
        new_desc = description if description is not None else slot["description"]
        new_date = date_str if date_str else slot["date"]
        new_start = start_time if start_time else slot["start_time"]
        new_end = end_time if end_time else slot["end_time"]
        new_avail = int(is_available) if is_available is not None else slot["is_available"]

        if new_start >= new_end:
            return jsonify({"success": False, "message": "Start time must be before end time."}), 400

        # Check uniqueness if date/start_time changed
        if new_date != slot["date"] or new_start != slot["start_time"]:
            dup = conn.execute(
                "SELECT id FROM appointment_slots WHERE date = ? AND start_time = ? AND id != ?",
                (new_date, new_start, slot_id)
            ).fetchone()
            if dup:
                return jsonify({"success": False, "message": "Another slot already exists at this date and time."}), 409

        conn.execute(
            """
            UPDATE appointment_slots
            SET title = ?, description = ?, date = ?, start_time = ?, end_time = ?, is_available = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (new_title, new_desc, new_date, new_start, new_end, new_avail, slot_id)
        )

        updated_slot = conn.execute("SELECT * FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone()

    return jsonify({
        "success": True,
        "message": "Appointment slot updated successfully.",
        "data": row_to_dict(updated_slot)
    }), 200

@slot_bp.route("/<int:slot_id>", methods=["DELETE"])
@admin_required
def delete_slot(slot_id):
    """
    Delete a slot only when it has no active booking.
    Rule 4 & 5: Check if there's any active booking for this slot.
    """
    with get_db() as conn:
        slot = conn.execute("SELECT * FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone()
        if not slot:
            return jsonify({"success": False, "message": "Appointment slot not found."}), 404

        # Check for active confirmed booking
        active_booking = conn.execute(
            """
            SELECT a.id, a.booking_reference, u.name 
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            WHERE a.slot_id = ? AND a.status = 'confirmed'
            """,
            (slot_id,)
        ).fetchone()

        if active_booking:
            return jsonify({
                "success": False,
                "message": f"Cannot delete slot: it is currently booked by {active_booking['name']} (Ref: {active_booking['booking_reference']}). You must cancel or complete the appointment first."
            }), 400

        # If appointments exist with status 'cancelled' or 'completed', we can either keep history or remove
        # Since appointments has FOREIGN KEY ON DELETE RESTRICT, if there are cancelled/completed historical rows,
        # we can delete the historical appointments or allow deletion. Let's delete associated inactive appointments or remove slot safely:
        conn.execute("DELETE FROM appointments WHERE slot_id = ? AND status IN ('cancelled', 'completed')", (slot_id,))
        conn.execute("DELETE FROM appointment_slots WHERE id = ?", (slot_id,))

    return jsonify({
        "success": True,
        "message": "Appointment slot deleted successfully."
    }), 200
