-- ============================================
-- Custom Tabs Table for Dynamic Script Tabs
-- Run this migration on your MySQL database
-- ============================================

-- Custom Tabs Table
-- Stores custom tab configurations for inbound/outbound scripts
CREATE TABLE IF NOT EXISTS homebound_custom_tabs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tab_key VARCHAR(100) NOT NULL UNIQUE,
    tab_title VARCHAR(255) NOT NULL,
    group_type ENUM('inbound', 'outbound') NOT NULL,
    display_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_group_type (group_type),
    KEY idx_display_order (display_order),
    KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: When a custom tab is created, a corresponding entry is also
-- automatically added to the homebound_script table with the tab_key
-- as the step_name. This ensures script content storage works seamlessly.
