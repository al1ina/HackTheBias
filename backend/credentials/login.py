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
        SELECT u.id, u.password_hash, u.email_verified, 
               COALESCE(up.level_type, 'beginner') as level_type,
               COALESCE(up.level_number, 1) as level_number
        FROM users u
        LEFT JOIN user_progress up ON u.id = up.user_id
        WHERE u.username = %s
        """
        cursor.execute(query, (username,))
        result = cursor.fetchone()

        if not result:
            return {
                "login": False
            }

        user_id, stored_hash, email_verified, level_type, level_number = result

        if not email_verified:
            return {
                "login": False
            }

        if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
            return {
                "login": False
            }

        return {
            "login": True,
            "user_id": user_id,
            "level_type": level_type,
            "level_number": level_number
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