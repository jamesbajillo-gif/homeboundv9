-- Migration script to add custom tabs support for List ID configurations
-- Run this SQL in your MySQL database to enable custom tabs for List IDs

CREATE TABLE IF NOT EXISTS tmdebt_listid_custom_tabs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL,
    tab_key VARCHAR(100) NOT NULL UNIQUE,
    tab_title VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_list_id (list_id),
    KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
