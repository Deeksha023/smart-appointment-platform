import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify
from .config import Config
from .database import get_db, row_to_dict

def generate_token(user_id, email, role, name):
    """Generate a signed JWT token valid for Config.JWT_EXPIRATION_HOURS."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def decode_token(token):
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require a valid JWT token in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({
                "success": False,
                "message": "Authorization token is missing. Please log in."
            }), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({
                "success": False,
                "message": "Invalid token format. Format must be 'Bearer <token>'."
            }), 401

        token = parts[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({
                "success": False,
                "message": "Token is invalid or has expired. Please log in again."
            }), 401

        # Verify user still exists in database
        with get_db() as conn:
            user_row = conn.execute(
                "SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?",
                (payload["user_id"],)
            ).fetchone()

        if not user_row:
            return jsonify({
                "success": False,
                "message": "User associated with this token no longer exists."
            }), 401

        request.current_user = row_to_dict(user_row)
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator to require an admin user."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.current_user.get("role") != "admin":
            return jsonify({
                "success": False,
                "message": "Access denied. Administrator privileges required."
            }), 403
        return f(*args, **kwargs)
    return decorated
