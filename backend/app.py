from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import mysql.connector

# Import backend logic
from credentials.signup import signup_user
from credentials.verify_email import verify_email
from credentials.login import login_user
from credentials.user_progress import get_user_progress, update_user_progress, save_level_score, get_level_score, DB_CONFIG

# Try to import AI evaluation (optional - server can run without it)
try:
    from ai_evaluation import evaluate_image
    AI_EVALUATION_AVAILABLE = True
except ImportError as e:
    print(f"Warning: AI evaluation not available: {e}")
    print("Server will start, but /ai-evaluate endpoint will return errors")
    AI_EVALUATION_AVAILABLE = False
    evaluate_image = None

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


# ---------- SAVE LEVEL SCORE ----------
@app.route("/save-score", methods=["POST"])
def save_score():
    payload = request.get_json()

    if not payload:
        return jsonify({
            "success": False,
            "message": "Invalid JSON payload"
        }), 400

    user_id = payload.get("user_id")
    level_type = payload.get("level_type", "beginner")
    level_number = payload.get("level_number", 1)
    score = payload.get("score", 0)

    if not user_id or score < 0:
        return jsonify({
            "success": False,
            "message": "user_id and score required"
        }), 400

    result = save_level_score(user_id, level_type, level_number, score)
    return jsonify(result), 200


# ---------- GET LEVEL SCORE ----------
@app.route("/get-score", methods=["GET"])
def get_score():
    user_id = request.args.get("user_id", type=int)
    level_type = request.args.get("level_type", "beginner")
    level_number = request.args.get("level_number", type=int, default=1)

    if not user_id:
        return jsonify({
            "success": False,
            "message": "user_id required"
        }), 400

    result = get_level_score(user_id, level_type, level_number)
    return jsonify(result), 200


# ---------- GET LEADERBOARD (Highest scoring player by level_type) ----------
@app.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    """
    Get the highest scoring player for a given level_type.
    Returns the player's name with the highest total score across all levels of that type.
    """
    level_type = request.args.get("level_type", "beginner")
    
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        
        # Check if table exists, create if not
        cursor.execute("SHOW TABLES LIKE 'level_scores'")
        if not cursor.fetchone():
            # Create the table if it doesn't exist
            create_table_query = """
            CREATE TABLE IF NOT EXISTS level_scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                level_type VARCHAR(100) NOT NULL,
                level_number INT NOT NULL,
                score INT NOT NULL,
                highest_score INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_level (user_id, level_type, level_number),
                CONSTRAINT fk_level_scores_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                INDEX idx_user_level (user_id, level_type, level_number)
            )
            """
            cursor.execute(create_table_query)
            connection.commit()
        
        # Get user with highest total score for this level_type across all levels
        # If multiple users have same score, pick the most recently updated one
        query = """
        SELECT 
            u.name,
            u.username,
            SUM(ls.highest_score) as total_score,
            MAX(ls.updated_at) as last_updated
        FROM level_scores ls
        JOIN users u ON ls.user_id = u.id
        WHERE ls.level_type = %s
        GROUP BY u.id, u.name, u.username
        ORDER BY total_score DESC, last_updated DESC
        LIMIT 1
        """
        cursor.execute(query, (level_type,))
        result = cursor.fetchone()
        
        if result:
            return jsonify({
                "success": True,
                "name": result["name"],
                "username": result["username"],
                "total_score": int(result["total_score"]) if result["total_score"] else 0,
                "level_type": level_type
            }), 200
        else:
            return jsonify({
                "success": True,
                "name": "No players yet",
                "username": None,
                "total_score": 0,
                "level_type": level_type
            }), 200
            
    except mysql.connector.Error as e:
        error_msg = str(e)
        return jsonify({
            "success": False,
            "message": f"Database error: {error_msg}",
            "error": error_msg
        }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Unexpected error: {str(e)}"
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()


# ---------- ASL SIGN CLASSIFICATION (for Pro and Expert levels) ----------
# Uses MediaPipe landmarks sent from frontend to classify hand signs
def _distance(point_a, point_b):
    """Calculate distance between two points"""
    return math.hypot(point_a["x"] - point_b["x"], point_a["y"] - point_b["y"])


def _finger_extended(landmarks, tip_idx, pip_idx, palm_size):
    """Check if a finger is extended (pointing up)"""
    return (landmarks[pip_idx]["y"] - landmarks[tip_idx]["y"]) > (0.15 * palm_size)


def _finger_curled(landmarks, tip_idx, pip_idx, palm_size):
    """Check if a finger is curled down"""
    return (landmarks[tip_idx]["y"] - landmarks[pip_idx]["y"]) > (0.15 * palm_size)


def _fingers_together(landmarks, tip1_idx, tip2_idx, threshold=0.08):
    """Check if two finger tips are close together"""
    dist = _distance(landmarks[tip1_idx], landmarks[tip2_idx])
    return dist < threshold


def _fingers_spread(landmarks, tip1_idx, tip2_idx, threshold=0.15):
    """Check if two finger tips are spread apart"""
    dist = _distance(landmarks[tip1_idx], landmarks[tip2_idx])
    return dist > threshold


def _classify_sign(landmarks):
    """
    Classify ASL sign from hand landmarks.
    Supports all letters A through W using geometric analysis.
    """
    if len(landmarks) < 21:
        return {"label": "UNKNOWN", "confidence": 0.0}
    
    wrist = landmarks[0]
    index_mcp = landmarks[5]
    palm_size = max(_distance(wrist, index_mcp), 0.05)

    # Extract finger states
    thumb_tip = landmarks[4]
    thumb_ip = landmarks[3]
    thumb_mcp = landmarks[2]
    index_tip = landmarks[8]
    index_pip = landmarks[6]
    middle_tip = landmarks[12]
    middle_pip = landmarks[10]
    ring_tip = landmarks[16]
    ring_pip = landmarks[14]
    pinky_tip = landmarks[20]
    pinky_pip = landmarks[18]

    # Finger extension states
    index_extended = _finger_extended(landmarks, 8, 6, palm_size)
    middle_extended = _finger_extended(landmarks, 12, 10, palm_size)
    ring_extended = _finger_extended(landmarks, 16, 14, palm_size)
    pinky_extended = _finger_extended(landmarks, 20, 18, palm_size)
    
    fingers_extended = [index_extended, middle_extended, ring_extended, pinky_extended]
    extended_count = sum(1 for ext in fingers_extended if ext)
    
    # Thumb position analysis
    thumb_out = _distance(thumb_tip, index_mcp) > (0.7 * palm_size)
    thumb_tucked = thumb_tip["y"] > (thumb_ip["y"] - 0.02)
    thumb_extended_up = thumb_tip["y"] < thumb_mcp["y"] - (0.1 * palm_size)
    thumb_crossed = thumb_tip["x"] < index_mcp["x"] - (0.2 * palm_size)
    
    # Finger spacing analysis
    index_middle_together = _fingers_together(landmarks, 8, 12)
    index_middle_spread = _fingers_spread(landmarks, 8, 12)
    middle_ring_together = _fingers_together(landmarks, 12, 16)
    
    # Hand curvature (for C shape)
    index_middle_curved = not index_extended and not middle_extended and not ring_extended
    index_curved_down = index_tip["y"] > index_pip["y"] + (0.1 * palm_size)
    middle_curved_down = middle_tip["y"] > middle_pip["y"] + (0.1 * palm_size)
    
    # Calculate scores for allowed letters only: A, B, C, D, H, L, V, Y, W
    scores = {}
    
    # A: Fist with thumb out
    scores["C"] = (1.0 if (extended_count == 0 and thumb_out) else 0.0) * 0.8 + \
                  (0.2 if not index_extended and not middle_extended and not ring_extended and not pinky_extended else 0.0)
    
    # B: All fingers extended, thumb tucked
    scores["B"] = (extended_count / 4.0) * 0.7 + (0.3 if thumb_tucked else 0.0)
    
    # C: Curved hand like C shape
    curve_score = 0.0
    if index_curved_down and middle_curved_down and not index_extended and not middle_extended:
        curve_score = 0.8
    if not ring_extended and not pinky_extended:
        curve_score += 0.2
    scores["A"] = curve_score
    
    # D: Index up, others grouped/curled below
    other_fingers_down = not middle_extended and not ring_extended and not pinky_extended
    # Check if other fingers are grouped together (tips close to each other)
    middle_ring_close = _fingers_together(landmarks, 12, 16, 0.12)
    ring_pinky_close = _fingers_together(landmarks, 16, 20, 0.12)
    fingers_grouped = middle_ring_close and ring_pinky_close
    
    scores["D"] = (1.0 if index_extended else 0.0) * 0.75 + \
                  (1.0 if other_fingers_down else 0.0) * 0.25 + \
                  (0.15 if fingers_grouped else 0.0)
    
    # H: Index and middle together up
    scores["H"] = (1.0 if index_extended and middle_extended and index_middle_together else 0.0) * 0.8 + \
                  (1.0 if not ring_extended and not pinky_extended else 0.0) * 0.2
    
    # L: Index up, thumb out (L shape)
    scores["L"] = (1.0 if index_extended and thumb_out else 0.0) * 0.7 + \
                  (1.0 if not middle_extended and not ring_extended and not pinky_extended else 0.0) * 0.3
    
    # V: Index and middle spread apart up
    scores["V"] = (1.0 if index_extended and middle_extended and index_middle_spread else 0.0) * 0.8 + \
                  (1.0 if not ring_extended and not pinky_extended else 0.0) * 0.2
    
    # Y: Pinky and thumb extended outward (hang loose gesture)
    pinky_thumb_spread = _distance(pinky_tip, thumb_tip) > (0.8 * palm_size)
    scores["Y"] = (1.0 if pinky_extended and thumb_out else 0.0) * 0.7 + \
                  (1.0 if not index_extended and not middle_extended and not ring_extended else 0.0) * 0.3
    
    # W: Three fingers up (index, middle, ring)
    scores["W"] = (1.0 if index_extended and middle_extended and ring_extended else 0.0) * 0.8 + \
                  (1.0 if not pinky_extended else 0.0) * 0.2
    
    # Find best match
    best_letter = max(scores.items(), key=lambda x: x[1])
    
    # Normalize confidence to 0-1 range
    confidence = min(max(best_letter[1], 0.0), 1.0)
    
    return {
        "label": best_letter[0],
        "confidence": round(confidence, 2),
    }


@app.route("/asl/check", methods=["POST"])
def asl_check():
    """
    AI-based sign language evaluation endpoint using hand landmarks.
    
    Receives MediaPipe landmarks from frontend and classifies the sign.
    Used by Pro and Expert (Advanced) levels for camera-based evaluation.
    
    Camera Input: Hand landmarks extracted by MediaPipe in browser
    AI Inference: Geometric analysis of landmark positions
    Evaluation: Compares detected letter against expected letter
    """
    payload = request.get_json()

    if not payload:
        return jsonify({
            "success": False,
            "message": "Invalid JSON payload"
        }), 400

    landmarks = payload.get("landmarks")
    target = payload.get("target")

    if not landmarks or not target:
        return jsonify({
            "success": False,
            "message": "Missing landmarks or target sign"
        }), 400

    target = str(target).upper()

    if len(landmarks) < 21:
        return jsonify({
            "success": False,
            "message": "Not enough hand landmarks provided"
        }), 400

    result = _classify_sign(landmarks)
    match = result["label"] == target

    return jsonify({
        "success": True,
        "target": target,
        "prediction": result["label"],
        "confidence": result["confidence"],
        "match": match
    }), 200


# ---------- AI EVALUATION (for Pro and Expert levels - legacy image-based) ----------
@app.route("/ai-evaluate", methods=["POST"])
def ai_evaluate():
    """
    AI-based sign language evaluation endpoint.
    
    Receives image frames from camera and evaluates detected signs.
    Used by Pro and Expert (Advanced) levels for camera-based evaluation.
    """
    if not AI_EVALUATION_AVAILABLE:
        return jsonify({
            "success": False,
            "message": "AI evaluation not available. Please install required dependencies: pip install mediapipe tensorflow pillow numpy opencv-python huggingface-hub"
        }), 503
    
    if 'image' not in request.files:
        return jsonify({
            "success": False,
            "message": "No image provided"
        }), 400
    
    expected_letter = request.form.get('expected_letter', '').upper()
    if not expected_letter:
        return jsonify({
            "success": False,
            "message": "expected_letter required"
        }), 400
    
    try:
        image_file = request.files['image']
        image_data = image_file.read()
        
        # Evaluate image using AI
        result = evaluate_image(image_data, expected_letter)
        
        return jsonify({
            "success": True,
            "detected_letter": result['detected_letter'],
            "confidence": result['confidence'],
            "is_correct": result['is_correct'],
            "expected_letter": result['expected_letter']
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Evaluation error: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )