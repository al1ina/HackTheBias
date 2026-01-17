# will connect frontend to backend trust

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import bcrypt

app = Flask(__name__)
CORS(app)  # allow frontend to call backend

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "strain3872AK",
    "database": "silent_speak_db",
    "port": 3306
}

def login_user(username: str, password: str):
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        cursor.execute("""
            SELECT password_hash, email_verified
            FROM users
            WHERE username = %s
        """, (username,))
        result = cursor.fetchone()

        # app.logger.info(f"DB result: {result}")

        if not result:
            app.logger.info("User not found in database")
            return {"login": False, "message": "User does not exist"}

        stored_hash, email_verified = result

        # app.logger.info(f"stored_hash type: {type(stored_hash)}")
        # app.logger.info(f"stored_hash repr: {repr(stored_hash)}")
        # app.logger.info(f"stored_hash length: {len(stored_hash) if stored_hash else 0}")
        # app.logger.info(f"email_verified: {email_verified}")

        if not email_verified:
            app.logger.info("Email not verified")
            return {"login": False, "message": "Email not verified"}

        # Handle different hash storage formats
        if isinstance(stored_hash, str):
            stored_hash_bytes = stored_hash.encode("utf-8")
        else:
            stored_hash_bytes = stored_hash

        password_bytes = password.encode("utf-8")

        # app.logger.info(f"Checking password with bcrypt...")
        # app.logger.info(f"Password to check: {password}")
        # app.logger.info(f"Hash starts with: {stored_hash[:10] if stored_hash else 'None'}")

        if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
            # app.logger.info("Password check FAILED")
            return {"login": False, "message": "Incorrect password"}

        # app.logger.info("Password check PASSED")
        return {"login": True, "message": "Login successful"}

    except mysql.connector.Error as e:
        # app.logger.exception(f"DB error: {e}")
        return {"login": False, "message": "Internal server error"}
    except Exception as e:
        # app.logger.exception(f"Unexpected error: {e}")
        return {"login": False, "message": "Internal server error"}

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.post("/login")
def login():
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")

    # app.logger.info(f"Login attempt for username: {username}")

    if not username or not password:
        return jsonify({"login": False, "message": "Missing fields"}), 400

    # TEMP: Generate a test hash to compare format
    test_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    # app.logger.info(f"Test hash format: {test_hash}")
    # app.logger.info(f"Test hash decoded: {test_hash.decode('utf-8')}")

    result = login_user(username, password)

    if result["login"]:
        return jsonify(result), 200
    else:
        return jsonify(result), 401

# Helper endpoint to create a test user (REMOVE IN PRODUCTION)
@app.post("/create-test-user")
def create_test_user():
    try:
        username = "testuser"
        password = "test123"
        
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO users (username, password_hash, email_verified)
            VALUES (%s, %s, 1)
        """, (username, hashed))
        
        connection.commit()
        
        return jsonify({
            "success": True,
            "message": f"Test user created: username='testuser', password='test123'",
            "hash": hashed
        }), 200
        
    except mysql.connector.Error as e:
        # app.logger.exception(f"Error creating test user: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

if __name__ == "__main__":
    app.run(debug=True, port=5000)