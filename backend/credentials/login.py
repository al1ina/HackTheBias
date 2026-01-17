import mysql.connector
import bcrypt

# ---------- DATABASE CONFIG ----------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "Omar2011",
    "database": "silent_speak_db",
    "port": 3306
}

# ---------- LOGIN (JSON IN / JSON OUT) ----------
def login_user(payload: dict) -> dict:
    """
    Expected payload:
    {
      "username": "johndoe",
      "password": "StrongPassword123!"
    }
    """

    username = payload.get("username")
    password = payload.get("password")

    if not username or not password:
        return {
            "login": False
        }

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        query = """
        SELECT password_hash, email_verified
        FROM users
        WHERE username = %s
        """
        cursor.execute(query, (username,))
        result = cursor.fetchone()

        if not result:
            return {
                "login": False
            }

        stored_hash, email_verified = result

        if not email_verified:
            return {
                "login": False
            }

        if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
            return {
                "login": False
            }

        return {
            "login": True
        }

    except mysql.connector.Error:
        return {
            "login": False
        }

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()