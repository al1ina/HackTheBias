import mysql.connector

# ---------- DATABASE CONFIG ----------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "strain3872AK",
    "database": "silent_speak_db",
    "port": 3306
}

# ---------- EMAIL VERIFICATION (JSON IN / JSON OUT) ----------
def verify_email(payload: dict) -> dict:
    """
    Expected payload:
    {
      "code": "493821"
    }
    """

    code = payload.get("code")

    if not code:
        return {
            "verified": False
        }

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Find user by verification code
        query = """
        SELECT id, email_verified
        FROM users
        WHERE email_verification_code = %s
        """
        cursor.execute(query, (code,))
        result = cursor.fetchone()

        if not result:
            return {
                "verified": False
            }

        user_id, email_verified = result

        if email_verified:
            return {
                "verified": False
            }

        # Verify email and clear the code
        update_query = """
        UPDATE users
        SET email_verified = TRUE,
            email_verification_code = NULL
        WHERE id = %s
        """
        cursor.execute(update_query, (user_id,))
        connection.commit()

        return {
            "verified": True
        }

    except mysql.connector.Error:
        return {
            "verified": False
        }

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()