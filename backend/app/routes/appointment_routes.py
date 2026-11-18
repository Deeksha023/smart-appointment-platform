import secrets
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..database import get_db_connection, row_to_dict, rows_to_list
from ..middleware import token_required

appointment_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")

def generate_booking_ref():
    """Generate a readable, unique booking reference code, e.g., SAP-202611-4A8F."""
    date_part = datetime.now().strftime("%Y%m%d")
    hex_part = secrets.token_hex(3).upper()
    return f"SAP-{date_part}-{hex_part}"

def is_slot_in_past(date_str, start_time_str):
    """Check whether a slot's date and start time is in the past."""
    try:
        slot_dt = datetime.strptime(f"{date_str} {start_time_str}", "%Y-%m-%d %H:%M")
        return slot_dt < datetime.now()
    except Exception:
        return True

@appointment_bp.route("", methods=["POST"])
@token_required
def book_appointment():
    """
    Book an appointment slot.
    Guarantees ACID concurrency control to prevent double booking.
    """
    data = request.get_json() or {}
    slot_id = data.get("slot_id")
    reason = data.get("reason", "").strip()
    notes = data.get("notes", "").strip()

    if not slot_id:
        return jsonify({"success": False, "message": "Appointment slot ID is required."}), 400

    if not reason or len(reason) < 3:
        return jsonify({"success": False, "message": "Please provide a reason for the appointment (minimum 3 characters)."}), 400

    user_id = request.current_user["id"]

    # Open direct connection for transaction control
    conn = get_db_connection()
    try:
        # BEGIN IMMEDIATE prevents concurrent writes from race conditions
        conn.execute("BEGIN IMMEDIATE")

        # 1. Fetch the slot
        slot = conn.execute(
            "SELECT * FROM appointment_slots WHERE id = ?",
            (slot_id,)
        ).fetchone()

        if not slot:
            conn.rollback()
            return jsonify({"success": False, "message": "Selected appointment slot was not found."}), 404

        # 2. Check if slot is available
        if slot["is_available"] != 1:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "This slot is no longer available. Another user may have just booked it."
            }), 409

        # 3. Check if slot is in the past
        if is_slot_in_past(slot["date"], slot["start_time"]):
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Cannot book an appointment for a past date or time."
            }), 400

        # 4. Check if this user already has an active confirmed appointment for this exact slot
        existing_user_booking = conn.execute(
            "SELECT id FROM appointments WHERE slot_id = ? AND user_id = ? AND status = 'confirmed'",
            (slot_id, user_id)
        ).fetchone()

        if existing_user_booking:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "You already have a confirmed booking for this appointment slot."
            }), 409

        # 5. Atomically update the slot to unavailable
        cursor = conn.execute(
            """
            UPDATE appointment_slots
            SET is_available = 0, updated_at = datetime('now')
            WHERE id = ? AND is_available = 1
            """,
            (slot_id,)
        )

        if cursor.rowcount == 0:
            # Slot was snatched concurrently
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Conflict: This slot was just reserved by another user. Please choose another slot."
            }), 409

        # 6. Generate booking reference and create appointment
        booking_ref = generate_booking_ref()
        cursor = conn.execute(
            """
            INSERT INTO appointments (booking_reference, user_id, slot_id, reason, notes, status)
            VALUES (?, ?, ?, ?, ?, 'confirmed')
            """,
            (booking_ref, user_id, slot_id, reason, notes or None)
        )
        appointment_id = cursor.lastrowid

        # Commit transaction
        conn.commit()

        # Fetch complete appointment info
        appointment_row = conn.execute(
            """
            SELECT a.*, 
                   s.title AS slot_title, s.description AS slot_description, 
                   s.date AS slot_date, s.start_time, s.end_time,
                   u.name AS user_name, u.email AS user_email, u.phone AS user_phone
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
            """,
            (appointment_id,)
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Appointment booked successfully!",
            "data": row_to_dict(appointment_row)
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"An error occurred while booking: {str(e)}"}), 500
    finally:
        conn.close()

@appointment_bp.route("/my", methods=["GET"])
@token_required
def get_my_appointments():
    """Fetch all appointments for the logged-in user with optional status and date filters."""
    user_id = request.current_user["id"]
    status_filter = request.args.get("status")
    date_filter = request.args.get("date")

    query = """
        SELECT a.*, 
               s.title AS slot_title, s.description AS slot_description, 
               s.date AS slot_date, s.start_time, s.end_time
        FROM appointments a
        JOIN appointment_slots s ON a.slot_id = s.id
        WHERE a.user_id = ?
    """
    params = [user_id]

    if status_filter and status_filter.lower() != "all":
        query += " AND a.status = ?"
        params.append(status_filter.lower())

    if date_filter:
        query += " AND s.date = ?"
        params.append(date_filter)

    query += " ORDER BY s.date DESC, s.start_time DESC"

    conn = get_db_connection()
    try:
        rows = conn.execute(query, params).fetchall()
        appointments = rows_to_list(rows)

        # Mark each as upcoming / past for UI convenience
        now = datetime.now()
        for appt in appointments:
            try:
                slot_end = datetime.strptime(f"{appt['slot_date']} {appt['end_time']}", "%Y-%m-%d %H:%M")
                appt["is_past"] = slot_end < now
            except Exception:
                appt["is_past"] = False

        return jsonify({
            "success": True,
            "count": len(appointments),
            "data": appointments
        }), 200
    finally:
        conn.close()

@appointment_bp.route("/<int:appointment_id>", methods=["GET"])
@token_required
def get_appointment_details(appointment_id):
    """Fetch details of a single appointment. Enforces ownership or admin role."""
    user = request.current_user

    conn = get_db_connection()
    try:
        query = """
            SELECT a.*, 
                   s.title AS slot_title, s.description AS slot_description, 
                   s.date AS slot_date, s.start_time, s.end_time,
                   u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
                   cb.name AS cancelled_by_name
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            JOIN users u ON a.user_id = u.id
            LEFT JOIN users cb ON a.cancelled_by = cb.id
            WHERE a.id = ?
        """
        row = conn.execute(query, (appointment_id,)).fetchone()
        if not row:
            return jsonify({"success": False, "message": "Appointment not found."}), 404

        appt = row_to_dict(row)

        # Authorization: user must own appointment or be admin
        if user["role"] != "admin" and appt["user_id"] != user["id"]:
            return jsonify({
                "success": False,
                "message": "Access denied. You can only view your own appointments."
            }), 403

        # Add is_past status
        try:
            slot_end = datetime.strptime(f"{appt['slot_date']} {appt['end_time']}", "%Y-%m-%d %H:%M")
            appt["is_past"] = slot_end < datetime.now()
        except Exception:
            appt["is_past"] = False

        return jsonify({
            "success": True,
            "data": appt
        }), 200
    finally:
        conn.close()

@appointment_bp.route("/<int:appointment_id>/cancel", methods=["POST"])
@token_required
def cancel_appointment(appointment_id):
    """
    Cancel an appointment.
    Only the owner or an admin can cancel.
    If the slot is in the future, the slot is made available again.
    """
    user = request.current_user
    data = request.get_json() or {}
    cancellation_reason = data.get("reason", "Cancelled by user").strip()

    conn = get_db_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")

        # 1. Fetch appointment
        appt = conn.execute(
            """
            SELECT a.*, s.date AS slot_date, s.start_time, s.end_time, s.id AS slot_id
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            WHERE a.id = ?
            """,
            (appointment_id,)
        ).fetchone()

        if not appt:
            conn.rollback()
            return jsonify({"success": False, "message": "Appointment not found."}), 404

        # 2. Check authorization
        if user["role"] != "admin" and appt["user_id"] != user["id"]:
            conn.rollback()
            return jsonify({
                "success": False,
                "message": "Access denied. You can only cancel your own appointments."
            }), 403

        # 3. Check status
        if appt["status"] == "cancelled":
            conn.rollback()
            return jsonify({"success": False, "message": "This appointment has already been cancelled."}), 400

        if appt["status"] == "completed":
            conn.rollback()
            return jsonify({"success": False, "message": "Completed appointments cannot be cancelled."}), 400

        # 4. Update appointment to cancelled
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
            (cancellation_reason, user["id"], appointment_id)
        )

        # 5. Check if slot should be made available again:
        # Rule 4: If the slot date and time is in the future, reopen the slot!
        if not is_slot_in_past(appt["slot_date"], appt["start_time"]):
            conn.execute(
                """
                UPDATE appointment_slots
                SET is_available = 1, updated_at = datetime('now')
                WHERE id = ?
                """,
                (appt["slot_id"],)
            )

        conn.commit()

        # Fetch updated record
        updated = conn.execute(
            """
            SELECT a.*, 
                   s.title AS slot_title, s.date AS slot_date, s.start_time, s.end_time,
                   u.name AS user_name, u.email AS user_email
            FROM appointments a
            JOIN appointment_slots s ON a.slot_id = s.id
            JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
            """,
            (appointment_id,)
        ).fetchone()

        return jsonify({
            "success": True,
            "message": "Appointment cancelled successfully. The slot has been made available for booking.",
            "data": row_to_dict(updated)
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Error cancelling appointment: {str(e)}"}), 500
    finally:
        conn.close()
