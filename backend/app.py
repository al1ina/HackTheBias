from flask import Flask, request, jsonify
from flask_cors import CORS

# Import backend logic
from credentials.signup import signup_user
from credentials.verify_email import verify_email
from credentials.login import login_user
from credentials.user_progress import get_user_progress, update_user_progress

app = Flask(__name__)
CORS(app)  # Allow frontend to call backend (important)

# ---------- HEALTH CHECK ----------
@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "SilentSpeak backend running"}), 200


# ---------- SIGN UP ----------
@app.route("/signup", methods=["POST"])
def signup():
    payload = request.get_json()

    if not payload:
        return jsonify({
            "success": False,
            "message": "Invalid JSON payload"
        }), 400

    result = signup_user(payload)
    return jsonify(result), 200


# ---------- VERIFY EMAIL ----------
@app.route("/verify-email", methods=["POST"])
def verify():
    payload = request.get_json()

    if not payload:
        return jsonify({
            "verified": False
        }), 400

    result = verify_email(payload)
    return jsonify(result), 200


# ---------- LOGIN ----------
@app.route("/login", methods=["POST"])
def login():
    payload = request.get_json()

    if not payload:
        return jsonify({
            "login": False
        }), 400

    result = login_user(payload)
    return jsonify(result), 200


# ---------- GET USER PROGRESS ----------
@app.route("/user-progress", methods=["GET"])
def get_progress():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({
            "success": False,
            "message": "user_id required"
        }), 400

    result = get_user_progress(user_id)
    return jsonify(result), 200


# ---------- UPDATE USER PROGRESS ----------
@app.route("/update-progress", methods=["POST"])
def update_progress():
    payload = request.get_json()

    if not payload:
        return jsonify({
            "success": False,
            "message": "Invalid JSON payload"
        }), 400

    user_id = payload.get("user_id")
    level_type = payload.get("level_type", "beginner")
    level_number = payload.get("level_number", 1)

    if not user_id:
        return jsonify({
            "success": False,
            "message": "user_id required"
        }), 400

    result = update_user_progress(user_id, level_type, level_number)
    return jsonify(result), 200


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )