import re
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from ..database import get_db, row_to_dict
from ..middleware import generate_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "").strip()
    role = data.get("role", "user").strip().lower()

    # Validation
    if not name or len(name) < 2:
        return jsonify({"success": False, "message": "Name is required (minimum 2 characters)."}), 400

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({"success": False, "message": "A valid email address is required."}), 400

    if not password or len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters long."}), 400

    if role not in ("user", "admin"):
        role = "user"

    password_hash = generate_password_hash(password)

    try:
        with get_db() as conn:
            # Check duplicate email
            existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
            if existing:
                return jsonify({"success": False, "message": "An account with this email already exists."}), 409

            cursor = conn.execute(
                """
                INSERT INTO users (name, email, password_hash, role, phone)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, email, password_hash, role, phone or None)
            )
            user_id = cursor.lastrowid
            user_row = conn.execute(
                "SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
            user_data = row_to_dict(user_row)

        token = generate_token(user_data["id"], user_data["email"], user_data["role"], user_data["name"])

        return jsonify({
            "success": True,
            "message": "Registration successful.",
            "data": {
                "user": user_data,
                "token": token
            }
        }), 201

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error during registration: {str(e)}"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    with get_db() as conn:
        user_row = conn.execute(
            "SELECT id, name, email, password_hash, role, phone, created_at FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if not user_row or not check_password_hash(user_row["password_hash"], password):
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    user_dict = row_to_dict(user_row)
    user_dict.pop("password_hash", None)

    token = generate_token(user_dict["id"], user_dict["email"], user_dict["role"], user_dict["name"])

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user_dict['name']}!",
        "data": {
            "user": user_dict,
            "token": token
        }
    }), 200

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user_profile():
    return jsonify({
        "success": True,
        "data": {
            "user": request.current_user
        }
    }), 200

@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    if not name or len(name) < 2:
        return jsonify({"success": False, "message": "Name is required (minimum 2 characters)."}), 400

    user_id = request.current_user["id"]

    with get_db() as conn:
        conn.execute(
            """
            UPDATE users
            SET name = ?, phone = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (name, phone or None, user_id)
        )
        updated_row = conn.execute(
            "SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

    return jsonify({
        "success": True,
        "message": "Profile updated successfully.",
        "data": {
            "user": row_to_dict(updated_row)
        }
    }), 200

@auth_bp.route("/change-password", methods=["PUT"])
@token_required
def change_password():
    data = request.get_json() or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return jsonify({"success": False, "message": "Current password and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "message": "New password must be at least 6 characters long."}), 400

    user_id = request.current_user["id"]

    with get_db() as conn:
        user_row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user_row or not check_password_hash(user_row["password_hash"], current_password):
            return jsonify({"success": False, "message": "Current password is incorrect."}), 400

        new_hash = generate_password_hash(new_password)
        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            (new_hash, user_id)
        )

    return jsonify({
        "success": True,
        "message": "Password changed successfully."
    }), 200
