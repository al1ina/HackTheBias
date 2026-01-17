import mysql.connector
import bcrypt
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ---------- DATABASE CONFIG ----------
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "strain3872AK",
    "database": "silent_speak_db",
    "port": 3306
}

# ---------- EMAIL CONFIG ----------
SMTP_EMAIL = "boudyattia1@gmail.com"
SMTP_PASSWORD = "ubfncwwclepluqzc"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587


# ---------- HELPER FUNCTIONS ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def generate_verification_code() -> str:
    return str(random.randint(100000, 999999))

def send_verification_email(to_email: str, code: str):
    message = MIMEMultipart()
    message["From"] = SMTP_EMAIL
    message["To"] = to_email
    message["Subject"] = "SilentSpeak Email Verification"

    body = f"""
Welcome to SilentSpeak!

Your verification code is:

{code}

Enter this code in the app to verify your email.
"""
    message.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(message)

def username_exists(cursor, username):
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    return cursor.fetchone() is not None

def email_exists(cursor, email):
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    return cursor.fetchone() is not None


# ---------- SIGNUP (JSON IN / JSON OUT) ----------

def signup_user(payload: dict) -> dict:
    """
    Expected payload:
    {
      "name": "...",
      "username": "...",
      "email": "...",
      "confirm_email": "...",
      "password": "..."
    }
    """

    name = payload.get("name")
    username = payload.get("username")
    email = payload.get("email")
    confirm_email = payload.get("confirm_email")
    password = payload.get("password")

    # Basic validation
    if not all([name, username, email, confirm_email, password]):
        return {
            "success": False,
            "message": "Missing required fields"
        }

    if email != confirm_email:
        return {
            "success": False,
            "message": "Emails do not match"
        }

    verification_code = generate_verification_code()
    hashed_password = hash_password(password)

    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        if username_exists(cursor, username):
            return {
                "success": False,
                "message": "Username already in use"
            }

        if email_exists(cursor, email):
            return {
                "success": False,
                "message": "Email already in use"
            }

        insert_query = """
        INSERT INTO users
        (name, username, email, password_hash, email_verified, email_verification_code)
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            insert_query,
            (name, username, email, hashed_password, False, verification_code)
        )
        connection.commit()

        try:
            send_verification_email(email, verification_code)
        except Exception:
            return {
                "success": False,
                "message": "Email address does not exist or cannot receive mail"
            }

        return {
            "success": True,
            "message": "Verification code sent"
        }

    except mysql.connector.IntegrityError:
        return {
            "success": False,
            "message": "Username or email already in use"
        }

    except mysql.connector.Error:
        return {
            "success": False,
            "message": "Internal database error"
        }

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()