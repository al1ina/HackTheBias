import mysql.connector

# ---------- DATABASE CONFIG ----------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "Omar2011",
    "database": "silent_speak_db",
    "port": 3306
}

# ---------- GET USER PROGRESS ----------
def get_user_progress(user_id: int) -> dict:
    """
    Returns user's current progress
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT level_type, level_number, streak, last_activity
        FROM user_progress
        WHERE user_id = %s
        """
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()

        if not result:
            # Default progress if not found
            return {
                "level_type": "beginner",
                "level_number": 1,
                "streak": 0
            }

        return {
            "level_type": result["level_type"],
            "level_number": result["level_number"],
            "streak": result["streak"]
        }

    except mysql.connector.Error:
        return {
            "level_type": "beginner",
            "level_number": 1,
            "streak": 0
        }

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()


# ---------- UPDATE USER PROGRESS (INCREMENT LEVEL) ----------
def update_user_progress(user_id: int, level_type: str, level_number: int) -> dict:
    """
    Updates user's progress to next level
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Check if user_progress exists
        check_query = "SELECT user_id FROM user_progress WHERE user_id = %s"
        cursor.execute(check_query, (user_id,))
        exists = cursor.fetchone()

        if exists:
            # Update existing progress
            update_query = """
            UPDATE user_progress
            SET level_type = %s, level_number = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """
            cursor.execute(update_query, (level_type, level_number, user_id))
        else:
            # Create new progress entry
            insert_query = """
            INSERT INTO user_progress (user_id, level_type, level_number)
            VALUES (%s, %s, %s)
            """
            cursor.execute(insert_query, (user_id, level_type, level_number))

        connection.commit()

        return {
            "success": True,
            "level_type": level_type,
            "level_number": level_number
        }

    except mysql.connector.Error as e:
        return {
            "success": False,
            "message": str(e)
        }

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()
