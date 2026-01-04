-- Migration: Script Submissions Table
-- Date: 2026-01-01
-- Description: Stores user-submitted scripts that can be approved to become globally available

CREATE TABLE IF NOT EXISTS `tmdebt_script_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `script_name` VARCHAR(100) NOT NULL COMMENT 'e.g., inbound_greeting, outbound_closingSuccess',
  `spiel_id` VARCHAR(100) NOT NULL COMMENT 'Identifier for the base spiel, e.g., spiel_0',
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

