-- ============================================
-- SQL Query to Check for Missing Tables
-- This query identifies which required tmdebt_ tables are missing from the database
-- ============================================

-- Method 1: Using INFORMATION_SCHEMA (Recommended - Works with all MySQL versions)
-- This query shows which required tables are missing
SELECT 
    'tmdebt_script' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_script'

UNION ALL

SELECT 
    'tmdebt_list_id_config' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_list_id_config'

UNION ALL

SELECT 
    'tmdebt_qualification_form_fields' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_qualification_form_fields'

UNION ALL

SELECT 
    'tmdebt_user_groups' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_user_groups'

UNION ALL

SELECT 
    'tmdebt_zapier_settings' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_zapier_settings'

UNION ALL

SELECT 
    'tmdebt_app_settings' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_app_settings'

UNION ALL

SELECT 
    'tmdebt_script_question_alts' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_script_question_alts'

UNION ALL

SELECT 
    'tmdebt_spiel_alts' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_spiel_alts'

UNION ALL

SELECT 
    'tmdebt_objection_alts' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_objection_alts'

UNION ALL

SELECT 
    'tmdebt_script_submissions' AS required_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'EXISTS' 
        ELSE 'MISSING' 
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'tmdebt_script_submissions'

ORDER BY status DESC, required_table ASC;

-- ============================================
-- Method 2: Simplified Query - Shows Only Missing Tables
-- ============================================
SELECT 
    'tmdebt_script' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_script'
)

UNION ALL

SELECT 
    'tmdebt_list_id_config' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_list_id_config'
)

UNION ALL

SELECT 
    'tmdebt_qualification_form_fields' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_qualification_form_fields'
)

UNION ALL

SELECT 
    'tmdebt_user_groups' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_user_groups'
)

UNION ALL

SELECT 
    'tmdebt_zapier_settings' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_zapier_settings'
)

UNION ALL

SELECT 
    'tmdebt_app_settings' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_app_settings'
)

UNION ALL

SELECT 
    'tmdebt_script_question_alts' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_script_question_alts'
)

UNION ALL

SELECT 
    'tmdebt_spiel_alts' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_spiel_alts'
)

UNION ALL

SELECT 
    'tmdebt_objection_alts' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_objection_alts'
)

UNION ALL

SELECT 
    'tmdebt_script_submissions' AS missing_table
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = 'tmdebt_script_submissions'
)

ORDER BY missing_table ASC;

-- ============================================
-- Method 3: List All Existing tmdebt_ Tables
-- ============================================
SELECT 
    table_name AS existing_table,
    table_rows AS row_count,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name LIKE 'tmdebt_%'
ORDER BY table_name ASC;

-- ============================================
-- Method 4: Comprehensive Check with Summary
-- ============================================
SELECT 
    'Summary' AS report_type,
    COUNT(CASE WHEN table_name LIKE 'tmdebt_%' THEN 1 END) AS total_tmdebt_tables,
    (SELECT COUNT(*) FROM (
        SELECT 'tmdebt_script' AS required_table
        UNION ALL SELECT 'tmdebt_list_id_config'
        UNION ALL SELECT 'tmdebt_qualification_form_fields'
        UNION ALL SELECT 'tmdebt_user_groups'
        UNION ALL SELECT 'tmdebt_zapier_settings'
        UNION ALL SELECT 'tmdebt_app_settings'
        UNION ALL SELECT 'tmdebt_script_question_alts'
        UNION ALL SELECT 'tmdebt_spiel_alts'
        UNION ALL SELECT 'tmdebt_objection_alts'
        UNION ALL SELECT 'tmdebt_script_submissions'
    ) AS required) AS required_table_count,
    (SELECT COUNT(*) FROM (
        SELECT 'tmdebt_script' AS required_table
        UNION ALL SELECT 'tmdebt_list_id_config'
        UNION ALL SELECT 'tmdebt_qualification_form_fields'
        UNION ALL SELECT 'tmdebt_user_groups'
        UNION ALL SELECT 'tmdebt_zapier_settings'
        UNION ALL SELECT 'tmdebt_app_settings'
        UNION ALL SELECT 'tmdebt_script_question_alts'
        UNION ALL SELECT 'tmdebt_spiel_alts'
        UNION ALL SELECT 'tmdebt_objection_alts'
        UNION ALL SELECT 'tmdebt_script_submissions'
    ) AS required
    WHERE required_table IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
    )) AS existing_table_count
FROM information_schema.tables 
WHERE table_schema = DATABASE();

