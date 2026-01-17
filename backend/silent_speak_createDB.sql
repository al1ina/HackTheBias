## Create Data Base
CREATE DATABASE silent_speak_db;

USE silent_speak_db;

## Table Store all user info: { ID , name, username, email, password, timestamp"
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## Table Store all user progress {ID, level type, level number,  }

CREATE TABLE user_progress (
    user_id INT PRIMARY KEY,
    level_type VARCHAR(100) NOT NULL DEFAULT 'beginner',
    level_number INT NOT NULL DEFAULT 1,
    streak INT NOT NULL DEFAULT 0,
    last_activity DATE NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_progress_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
);
