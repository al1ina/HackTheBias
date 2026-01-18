-- Add level_scores table to store user scores per level
USE silent_speak_db;

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
);
