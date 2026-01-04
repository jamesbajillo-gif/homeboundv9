-- ============================================
-- Simple SQL Query to Check for Missing Tables
-- Run this query to see which required tables are missing
-- ============================================

-- List of all required tables
WITH required_tables AS (
    SELECT 'tmdebt_script' AS table_name
    UNION ALL SELECT 'tmdebt_list_id_config'
    UNION ALL SELECT 'tmdebt_qualification_form_fields'
    UNION ALL SELECT 'tmdebt_user_groups'
    UNION ALL SELECT 'tmdebt_zapier_settings'
    UNION ALL SELECT 'tmdebt_app_settings'
    UNION ALL SELECT 'tmdebt_script_question_alts'
    UNION ALL SELECT 'tmdebt_spiel_alts'
    UNION ALL SELECT 'tmdebt_objection_alts'
    UNION ALL SELECT 'tmdebt_script_submissions'
    UNION ALL SELECT 'tmdebt_custom_tabs'
    UNION ALL SELECT 'tmdebt_listid_custom_tabs'
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name LIKE 'tmdebt_%'
)
SELECT 
    rt.table_name AS required_table,
    CASE 
        WHEN et.table_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY status ASC, rt.table_name ASC;

-- ============================================
-- Alternative: Show only missing tables
-- ============================================
SELECT 
    rt.table_name AS missing_table
FROM (
    SELECT 'tmdebt_script' AS table_name
    UNION ALL SELECT 'tmdebt_list_id_config'
    UNION ALL SELECT 'tmdebt_qualification_form_fields'
    UNION ALL SELECT 'tmdebt_user_groups'
    UNION ALL SELECT 'tmdebt_zapier_settings'
    UNION ALL SELECT 'tmdebt_app_settings'
    UNION ALL SELECT 'tmdebt_script_question_alts'
    UNION ALL SELECT 'tmdebt_spiel_alts'
    UNION ALL SELECT 'tmdebt_objection_alts'
    UNION ALL SELECT 'tmdebt_script_submissions'
    UNION ALL SELECT 'tmdebt_custom_tabs'
    UNION ALL SELECT 'tmdebt_listid_custom_tabs'
) AS rt
WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name = rt.table_name
)
ORDER BY missing_table ASC;

