-- ============================================
-- MySQL Database Schema for Dynamic Script App
-- Create these tables in your MySQL database
-- ============================================

-- 1. Scripts Table (homebound_script)
CREATE TABLE IF NOT EXISTS homebound_script (
    id INT AUTO_INCREMENT PRIMARY KEY,
    step_name VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    button_config JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Qualification Form Fields Table
CREATE TABLE IF NOT EXISTS qualification_form_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_name VARCHAR(100) NOT NULL UNIQUE,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    field_section VARCHAR(50) NOT NULL DEFAULT 'personal',
    field_options JSON DEFAULT NULL,
    is_required TINYINT(1) DEFAULT 0,
    zapier_field_name VARCHAR(100) DEFAULT NULL,
    placeholder VARCHAR(255) DEFAULT NULL,
    help_text VARCHAR(500) DEFAULT NULL,
    validation_rules JSON DEFAULT NULL,
    display_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Zapier Settings Table
CREATE TABLE IF NOT EXISTS zapier_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_url VARCHAR(500) NOT NULL UNIQUE,
    webhook_name VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Groups Table
CREATE TABLE IF NOT EXISTS user_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_identifier VARCHAR(100) NOT NULL UNIQUE,
    group_type ENUM('inbound', 'outbound') NOT NULL DEFAULT 'inbound',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Sample inbound scripts
INSERT INTO homebound_script (step_name, title, content, button_config) VALUES
('greeting', 'Opening Spiel', 'Hello! Thank you for calling. My name is [Agent Name]. How may I help you today?', '[]'),
('qualification', 'Qualification', 'I would like to ask you a few questions to better assist you.', '[]'),
('objectionHandling', 'Objection Handling', 'I understand your concern. Let me address that...', '[]'),
('closingNotInterested', 'Closing - Not Interested', 'Thank you for your time. Have a great day!', '[]'),
('closingSuccess', 'Closing - Success', 'Great! I am glad we could help you today. Is there anything else?', '[]');

-- Sample outbound scripts
INSERT INTO homebound_script (step_name, title, content, button_config) VALUES
('outbound_greeting', 'Outbound Opening', 'Hello! This is [Agent Name] calling from [Company]. Am I speaking with [Customer Name]?', '[]'),
('outbound_qualification', 'Outbound Qualification', 'I am reaching out because we have an exciting opportunity for you.', '[]'),
('outbound_objection', 'Outbound Objection Handling', 'I completely understand. Many of our customers felt the same way before...', '[]'),
('outbound_closingNotInterested', 'Outbound Closing - Not Interested', 'I appreciate your time today. May I call you back at a more convenient time?', '[]'),
('outbound_closingSuccess', 'Outbound Closing - Success', 'Excellent! I will process that right away. Thank you for choosing us!', '[]');
