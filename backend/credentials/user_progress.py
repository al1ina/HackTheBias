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


# ---------- SAVE LEVEL SCORE ----------
def save_level_score(user_id: int, level_type: str, level_number: int, score: int) -> dict:
    """
    Saves a score for a level and updates highest_score if this is higher
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # Check if score record exists
        check_query = """
        SELECT highest_score FROM level_scores
        WHERE user_id = %s AND level_type = %s AND level_number = %s
        """
        cursor.execute(check_query, (user_id, level_type, level_number))
        result = cursor.fetchone()

        if result:
            # Update existing record
            current_highest = result[0] or 0
            new_highest = max(current_highest, score)
            
            update_query = """
            UPDATE level_scores
            SET score = %s, highest_score = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND level_type = %s AND level_number = %s
            """
            cursor.execute(update_query, (score, new_highest, user_id, level_type, level_number))
        else:
            # Insert new record
            insert_query = """
            INSERT INTO level_scores (user_id, level_type, level_number, score, highest_score)
            VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (user_id, level_type, level_number, score, score))

        connection.commit()

        return {
            "success": True,
            "score": score,
            "highest_score": max((result[0] if result else 0), score) if result else score
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


# ---------- GET LEVEL SCORE ----------
def get_level_score(user_id: int, level_type: str, level_number: int) -> dict:
    """
    Gets the highest score for a specific level
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT highest_score, score FROM level_scores
        WHERE user_id = %s AND level_type = %s AND level_number = %s
        """
        cursor.execute(query, (user_id, level_type, level_number))
        result = cursor.fetchone()

        if result:
            return {
                "success": True,
                "highest_score": result["highest_score"] or 0,
                "last_score": result["score"] or 0
            }
        else:
            return {
                "success": True,
                "highest_score": 0,
                "last_score": 0
            }

    except mysql.connector.Error as e:
        return {
            "success": False,
            "message": str(e),
            "highest_score": 0,
            "last_score": 0
        }

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()
