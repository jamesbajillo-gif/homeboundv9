-- Migration: Script-Specific Question Alternatives
-- Date: 2026-01-01
-- Description: Stores question text overrides and alternatives per script (inbound/outbound)

-- Table to store script-specific question alternatives
-- These override or extend the master question configuration for specific scripts

CREATE TABLE IF NOT EXISTS `homebound_script_question_alts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `script_name` varchar(50) NOT NULL COMMENT 'Script identifier: inbound_qualification, outbound_qualification, etc.',
  `question_id` varchar(100) NOT NULL COMMENT 'Reference to the question ID from qualification config',
  `alt_text` text NOT NULL COMMENT 'The alternative question text',
  `alt_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Order of this alternative within the question',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is the default selection for this script',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_script_question_order` (`script_name`, `question_id`, `alt_order`),
  KEY `idx_script_name` (`script_name`),
  KEY `idx_question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Script-specific question alternatives';

-- Example usage:
-- INSERT INTO homebound_script_question_alts (script_name, question_id, alt_text, alt_order, is_default)
-- VALUES ('outbound_qualification', 'property_type', 'Can you tell me what kind of property this is?', 1, 0);
