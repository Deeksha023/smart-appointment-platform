import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from .config import Config
from .database import init_db
from .seed import seed_database
from .routes.auth_routes import auth_bp
from .routes.slot_routes import slot_bp
from .routes.appointment_routes import appointment_bp
from .routes.admin_routes import admin_bp
from .routes.user_routes import user_bp

def create_app(config_class=Config):
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

    app = Flask(
        __name__, 
        static_folder=os.path.join(frontend_dist, "assets") if os.path.exists(frontend_dist) else None,
        static_url_path="/assets"
    )
    app.config.from_object(config_class)

    # Enable CORS for frontend development server
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize and seed database
    with app.app_context():
        try:
            init_db()
            seed_database()
        except Exception as e:
            print(f"Database initialization error: {e}")

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(slot_bp)
    app.register_blueprint(appointment_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)

    # Health check route
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Smart Appointment Platform API",
            "version": "1.0.0"
        }), 200

    # Serve React Frontend Build if present
    if os.path.exists(frontend_dist):
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            if path != "" and os.path.exists(os.path.join(frontend_dist, path)):
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, "index.html")

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        if app.static_folder and os.path.exists(os.path.join(frontend_dist, "index.html")):
            return send_from_directory(frontend_dist, "index.html")
        return jsonify({
            "success": False,
            "message": "The requested API endpoint was not found."
        }), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        return jsonify({
            "success": False,
            "message": "HTTP method not allowed for this route."
        }), 405

    @app.errorhandler(500)
    def handle_server_error(e):
        return jsonify({
            "success": False,
            "message": "An internal server error occurred."
        }), 500

    return app
