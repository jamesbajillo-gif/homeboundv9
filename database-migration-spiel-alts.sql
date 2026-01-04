-- Migration: Add spiel alternatives table for greeting and closing scripts
-- This mirrors the objection alternatives pattern

CREATE TABLE IF NOT EXISTS tmdebt_spiel_alts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  script_name VARCHAR(100) NOT NULL COMMENT 'e.g., inbound_greeting, outbound_closingSuccess',
  spiel_id VARCHAR(100) NOT NULL COMMENT 'Identifier for the base spiel, e.g., spiel_0',
  alt_text TEXT NOT NULL COMMENT 'The alternative text content',
  alt_order INT DEFAULT 1 COMMENT 'Order of this alternative (1-based)',
  is_default TINYINT DEFAULT 0 COMMENT 'Whether this is the default alternative',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_spiel_alt (script_name, spiel_id, alt_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for faster lookups by script_name
CREATE INDEX idx_spiel_alts_script ON tmdebt_spiel_alts(script_name);
