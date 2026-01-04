-- Migration: Create tmdebt_objection_alts table for script-specific objection alternatives
-- This table stores alternative objection handling responses per script (inbound/outbound/listid)

CREATE TABLE IF NOT EXISTS `tmdebt_objection_alts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `script_name` varchar(100) NOT NULL COMMENT 'Script identifier: inbound_objection, outbound_objection, or listid_{list_id}',
  `objection_id` varchar(100) NOT NULL COMMENT 'Unique identifier for the objection within the script',
  `alt_text` text NOT NULL COMMENT 'Alternative response text',
  `alt_order` int(11) NOT NULL DEFAULT 0 COMMENT 'Order of this alternative (0-based)',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Whether this is the default alternative to show',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_script_objection_order` (`script_name`, `objection_id`, `alt_order`),
  KEY `idx_script_name` (`script_name`),
  KEY `idx_objection_id` (`objection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stores script-specific alternative objection handling responses';

-- Example usage:
-- INSERT INTO tmdebt_objection_alts (script_name, objection_id, alt_text, alt_order) 
-- VALUES ('outbound_objection', 'objection_0', 'Alternative response for first objection', 1);
