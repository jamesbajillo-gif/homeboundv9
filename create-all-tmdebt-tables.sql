-- ============================================
-- Create All tmdebt_ Tables
-- This script creates all required tables for the application
-- All tables use the tmdebt_ prefix for consistency
-- Run this script to set up your database
-- ============================================

-- 1. Scripts Table
-- Stores call script content for different steps (greeting, qualification, etc.)
CREATE TABLE IF NOT EXISTS `tmdebt_script` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `step_name` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique identifier for the script step (e.g., greeting, qualification)',
    `title` TEXT NOT NULL COMMENT 'Display title for the script',
    `content` TEXT NOT NULL COMMENT 'The script content/text',
    `button_config` LONGTEXT DEFAULT NULL COMMENT 'JSON configuration for buttons/actions',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_step_name` (`step_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. List ID Configuration Table
-- Stores list ID-specific script overrides
CREATE TABLE IF NOT EXISTS `tmdebt_list_id_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `list_id` VARCHAR(255) NOT NULL COMMENT 'The list ID identifier',
    `name` VARCHAR(255) NOT NULL COMMENT 'Display name for this list ID configuration',
    `step_name` VARCHAR(255) DEFAULT NULL COMMENT 'Script step name (e.g., greeting, qualification)',
    `title` TEXT DEFAULT NULL COMMENT 'Display title for this step',
    `content` TEXT NOT NULL DEFAULT '' COMMENT 'Script content for this list ID and step',
    `properties` LONGTEXT DEFAULT NULL COMMENT 'JSON properties/configuration',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_list_step` (`list_id`, `step_name`),
    KEY `idx_list_id` (`list_id`),
    KEY `idx_step_name` (`step_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Qualification Form Fields Table
-- Stores dynamic form field definitions for qualification forms
CREATE TABLE IF NOT EXISTS `tmdebt_qualification_form_fields` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `field_name` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique field identifier',
    `field_label` VARCHAR(255) NOT NULL COMMENT 'Display label for the field',
    `field_type` VARCHAR(50) NOT NULL COMMENT 'Field type (text, select, checkbox, etc.)',
    `field_section` VARCHAR(50) NOT NULL COMMENT 'Section this field belongs to (personal, property, financial, etc.)',
    `field_options` LONGTEXT DEFAULT NULL COMMENT 'JSON options for select/radio fields',
    `is_required` TINYINT(1) DEFAULT 1 COMMENT 'Whether this field is required',
    `zapier_field_name` VARCHAR(255) DEFAULT NULL COMMENT 'Field name mapping for Zapier integration',
    `placeholder` VARCHAR(255) DEFAULT NULL COMMENT 'Placeholder text for the field',
    `help_text` TEXT DEFAULT NULL COMMENT 'Help text or description for the field',
    `validation_rules` LONGTEXT DEFAULT NULL COMMENT 'JSON validation rules',
    `display_order` INT(11) DEFAULT 0 COMMENT 'Display order within the section',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Whether this field is active/enabled',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_field_section` (`field_section`),
    KEY `idx_display_order` (`display_order`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Groups Table
-- Stores user group assignments (inbound/outbound)
CREATE TABLE IF NOT EXISTS `tmdebt_user_groups` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_identifier` VARCHAR(255) NOT NULL UNIQUE COMMENT 'User identifier (username, user ID, etc.)',
    `group_type` ENUM('inbound', 'outbound') NOT NULL DEFAULT 'inbound' COMMENT 'Type of group assignment',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_user_identifier` (`user_identifier`),
    KEY `idx_group_type` (`group_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Zapier Settings Table
-- Stores Zapier webhook configurations
CREATE TABLE IF NOT EXISTS `tmdebt_zapier_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `webhook_url` VARCHAR(500) NOT NULL UNIQUE COMMENT 'Zapier webhook URL',
    `webhook_name` VARCHAR(255) DEFAULT NULL COMMENT 'Display name for the webhook',
    `description` TEXT DEFAULT NULL COMMENT 'Description of what this webhook does',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Whether this webhook is active',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. App Settings Table
-- Stores application-wide settings (key-value store)
-- Used for migrating localStorage data and storing app configuration
CREATE TABLE IF NOT EXISTS `tmdebt_app_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique setting key (e.g., tmdebt_debug_mode)',
    `setting_value` TEXT NOT NULL COMMENT 'Setting value (stored as text, can be JSON)',
    `setting_type` ENUM('string', 'boolean', 'number', 'json') NOT NULL DEFAULT 'string' COMMENT 'Type of the setting value',
    `description` TEXT DEFAULT NULL COMMENT 'Description of what this setting does',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_setting_type` (`setting_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Script Question Alternatives Table
-- Stores script-specific question text overrides and alternatives
CREATE TABLE IF NOT EXISTS `tmdebt_script_question_alts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `script_name` VARCHAR(50) NOT NULL COMMENT 'Script identifier (e.g., inbound_qualification, outbound_qualification)',
    `question_id` VARCHAR(100) NOT NULL COMMENT 'Reference to the question ID from qualification config',
    `alt_text` TEXT NOT NULL COMMENT 'The alternative question text',
    `alt_order` INT(11) NOT NULL DEFAULT 0 COMMENT 'Order of this alternative within the question',
    `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is the default selection for this script',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_script_question_order` (`script_name`, `question_id`, `alt_order`),
    KEY `idx_script_name` (`script_name`),
    KEY `idx_question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Script-specific question alternatives';

-- 8. Spiel Alternatives Table
-- Stores alternative text for greeting and closing scripts
CREATE TABLE IF NOT EXISTS `tmdebt_spiel_alts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `script_name` VARCHAR(100) NOT NULL COMMENT 'Script identifier (e.g., inbound_greeting, outbound_closingSuccess)',
    `spiel_id` VARCHAR(100) NOT NULL COMMENT 'Identifier for the base spiel (e.g., spiel_0)',
    `alt_text` TEXT NOT NULL COMMENT 'The alternative text content',
    `alt_order` INT(11) NOT NULL DEFAULT 0 COMMENT 'Order of this alternative (0-based)',
    `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is the default alternative',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_script_spiel_order` (`script_name`, `spiel_id`, `alt_order`),
    KEY `idx_script_name` (`script_name`),
    KEY `idx_spiel_id` (`spiel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alternative text for greeting and closing scripts';

-- 9. Objection Alternatives Table
-- Stores script-specific objection handling responses
CREATE TABLE IF NOT EXISTS `tmdebt_objection_alts` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `script_name` VARCHAR(100) NOT NULL COMMENT 'Script identifier (e.g., inbound_objection, outbound_objection, or listid_{list_id})',
    `objection_id` VARCHAR(100) NOT NULL COMMENT 'Unique identifier for the objection within the script',
    `alt_text` TEXT NOT NULL COMMENT 'Alternative response text',
    `alt_order` INT(11) NOT NULL DEFAULT 0 COMMENT 'Order of this alternative (0-based)',
    `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is the default alternative to show',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_script_objection_order` (`script_name`, `objection_id`, `alt_order`),
    KEY `idx_script_name` (`script_name`),
    KEY `idx_objection_id` (`objection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores script-specific alternative objection handling responses';

-- 10. Script Submissions Table
-- Stores user-submitted scripts that can be approved to become globally available
CREATE TABLE IF NOT EXISTS `tmdebt_script_submissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `script_name` VARCHAR(100) NOT NULL COMMENT 'Script identifier (e.g., inbound_greeting, outbound_closingSuccess)',
    `spiel_id` VARCHAR(100) NOT NULL COMMENT 'Identifier for the base spiel (e.g., spiel_0)',
    `objection_id` VARCHAR(100) DEFAULT NULL COMMENT 'For objection submissions',
    `submission_type` ENUM('spiel', 'objection') NOT NULL COMMENT 'Type of script submission',
    `alt_text` TEXT NOT NULL COMMENT 'The submitted script text',
    `alt_order` INT DEFAULT 1 COMMENT 'Order of this alternative (1-based)',
    `submitted_by` VARCHAR(100) NOT NULL COMMENT 'User ID who submitted this',
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Submission status',
    `approved_by` VARCHAR(100) DEFAULT NULL COMMENT 'User ID who approved/rejected',
    `approved_at` DATETIME DEFAULT NULL COMMENT 'When it was approved/rejected',
    `rejection_reason` TEXT DEFAULT NULL COMMENT 'Reason for rejection if rejected',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_script_name` (`script_name`),
    INDEX `idx_submitted_by` (`submitted_by`),
    INDEX `idx_status` (`status`),
    INDEX `idx_script_status` (`script_name`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User-submitted scripts awaiting approval';

-- 11. Custom Tabs Table
-- Stores custom tab configurations for inbound/outbound scripts
CREATE TABLE IF NOT EXISTS `tmdebt_custom_tabs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tab_key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier for the tab (used as step_name in tmdebt_script)',
    `tab_title` VARCHAR(255) NOT NULL COMMENT 'Display title for the tab',
    `group_type` ENUM('inbound', 'outbound') NOT NULL COMMENT 'Type of group (inbound or outbound)',
    `display_order` INT DEFAULT 0 COMMENT 'Display order for sorting tabs',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Whether this tab is active/enabled',
    `tab_type` ENUM('script', 'questionnaire') DEFAULT 'script' COMMENT 'Type of tab: script or questionnaire form',
    `questionnaire_script_name` VARCHAR(100) DEFAULT NULL COMMENT 'Script name for questionnaire tabs (e.g., inbound_qualification, outbound_qualification)',
    `selected_section_ids` TEXT DEFAULT NULL COMMENT 'JSON array of selected section IDs for questionnaire tabs',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_group_type` (`group_type`),
    KEY `idx_display_order` (`display_order`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_tab_type` (`tab_type`),
    KEY `idx_questionnaire_script_name` (`questionnaire_script_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom tab configurations for inbound/outbound scripts';

-- 12. List ID Custom Tabs Table
-- Stores custom tab configurations for specific List IDs
CREATE TABLE IF NOT EXISTS `tmdebt_listid_custom_tabs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `list_id` VARCHAR(255) NOT NULL COMMENT 'The list ID identifier',
    `tab_key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier for the tab',
    `tab_title` VARCHAR(255) NOT NULL COMMENT 'Display title for the tab',
    `display_order` INT DEFAULT 0 COMMENT 'Display order for sorting tabs',
    `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Whether this tab is active/enabled',
    `tab_type` ENUM('script', 'questionnaire') DEFAULT 'script' COMMENT 'Type of tab: script or questionnaire form',
    `questionnaire_script_name` VARCHAR(100) DEFAULT NULL COMMENT 'Script name for questionnaire tabs',
    `selected_section_ids` TEXT DEFAULT NULL COMMENT 'JSON array of selected section IDs for questionnaire tabs',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_list_id` (`list_id`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_tab_type` (`tab_type`),
    KEY `idx_questionnaire_script_name` (`questionnaire_script_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom tab configurations for specific List IDs';

-- 13. User History Table
-- Stores user actions, spiel selections, and user preferences
CREATE TABLE IF NOT EXISTS `tmdebt_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(255) NOT NULL COMMENT 'User identifier from VICI (user, user_code, etc.)',
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IP address of the user',
    `action` ENUM('viewed', 'modified', 'added', 'updated', 'deleted', 'selected', 'cycled', 'submitted') NOT NULL COMMENT 'Type of action performed',
    `description` TEXT NOT NULL COMMENT 'Description of the action',
    `spiels_settings` JSON DEFAULT NULL COMMENT 'JSON object storing spiel selection settings',
    `metadata` JSON DEFAULT NULL COMMENT 'Additional metadata about the action',
    `user_agent` TEXT DEFAULT NULL COMMENT 'User agent string',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_user_id` (`user_id`),
    KEY `idx_action` (`action`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User action history and spiel settings';

-- ============================================
-- Verification Query
-- Run this after creating tables to verify all tables were created
-- This uses SHOW TABLES which doesn't require information_schema privileges
-- ============================================

-- Method 1: Simple list of all tmdebt_ tables
SHOW TABLES LIKE 'tmdebt_%';

-- Method 2: Count tables (alternative if SHOW TABLES doesn't work)
-- SELECT COUNT(*) AS total_tmdebt_tables
-- FROM (
--     SELECT 'tmdebt_script' AS table_name
--     UNION ALL SELECT 'tmdebt_list_id_config'
--     UNION ALL SELECT 'tmdebt_qualification_form_fields'
--     UNION ALL SELECT 'tmdebt_user_groups'
--     UNION ALL SELECT 'tmdebt_zapier_settings'
--     UNION ALL SELECT 'tmdebt_app_settings'
--     UNION ALL SELECT 'tmdebt_script_question_alts'
--     UNION ALL SELECT 'tmdebt_spiel_alts'
--     UNION ALL SELECT 'tmdebt_objection_alts'
--     UNION ALL SELECT 'tmdebt_script_submissions'
--     UNION ALL SELECT 'tmdebt_custom_tabs'
--     UNION ALL SELECT 'tmdebt_listid_custom_tabs'
--     UNION ALL SELECT 'tmdebt_users'
-- ) AS required_tables
-- WHERE EXISTS (
--     SELECT 1 
--     FROM information_schema.tables 
--     WHERE table_schema = DATABASE() 
--       AND table_name = required_tables.table_name
-- );

-- Method 3: Manual verification - Check each table exists by trying to describe it
-- DESCRIBE tmdebt_script;
-- DESCRIBE tmdebt_list_id_config;
-- DESCRIBE tmdebt_qualification_form_fields;
-- DESCRIBE tmdebt_user_groups;
-- DESCRIBE tmdebt_zapier_settings;
-- DESCRIBE tmdebt_app_settings;
-- DESCRIBE tmdebt_script_question_alts;
-- DESCRIBE tmdebt_spiel_alts;
-- DESCRIBE tmdebt_objection_alts;
-- DESCRIBE tmdebt_script_submissions;
-- DESCRIBE tmdebt_custom_tabs;
-- DESCRIBE tmdebt_listid_custom_tabs;
-- DESCRIBE tmdebt_users;

