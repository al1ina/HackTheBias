from flask import Flask, request, jsonify
from flask_cors import CORS

# Import backend logic
from credentials.signup import signup_user
from credentials.verify_email import verify_email
from credentials.login import login_user

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


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )