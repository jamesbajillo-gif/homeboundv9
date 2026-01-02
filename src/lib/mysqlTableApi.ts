/**
 * MySQL Table Listing API Client
 * Integrates with https://api.techpinoy.net/mysqlapi.php
 */

import { MySQLConfig, DEFAULT_DB_CONFIG } from './mysqlApi';

const MYSQL_API_URL = 'https://api.techpinoy.net/mysqlapi.php';

// Re-export MySQLConfig for convenience
export type { MySQLConfig };

// Use the same default config from mysqlApi.ts to avoid duplication
export const DEFAULT_MYSQL_CONFIG: MySQLConfig = DEFAULT_DB_CONFIG;

export interface TableListResponse {
  success: boolean;
  data?: string[];
  count?: number;
  database?: string;
  message?: string;
  error?: string;
  client_ip?: string;
  client_hostname?: string;
}

export class MySQLTableApiClient {
  /**
   * List all tables from a MySQL database
   */
  static async listTables(config: MySQLConfig): Promise<TableListResponse> {
    try {
      const params = new URLSearchParams({
        action: 'list_tables',
        sqlhost: config.sqlhost,
        sqlun: config.sqlun,
        sqlpw: config.sqlpw,
        sqldb: config.sqldb,
      });

      if (config.sqlport) {
        params.append('sqlport', config.sqlport.toString());
      }

      if (config.sqlcharset) {
        params.append('sqlcharset', config.sqlcharset);
      }

      const response = await fetch(`${MYSQL_API_URL}?${params.toString()}`);
      const data: TableListResponse = await response.json();

      return data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to MySQL API',
        error: error.toString(),
      };
    }
  }

  /**
   * Check if specific tables exist in the database
   */
  static async checkTablesExist(
    config: MySQLConfig,
    requiredTables: string[]
  ): Promise<{
    success: boolean;
    allExist: boolean;
    existingTables: string[];
    missingTables: string[];
    message?: string;
  }> {
    const result = await this.listTables(config);

    if (!result.success) {
      return {
        success: false,
        allExist: false,
        existingTables: [],
        missingTables: requiredTables,
        message: result.message || 'Failed to list tables',
      };
    }

    const existingTables = result.data || [];
    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table)
    );

    return {
      success: true,
      allExist: missingTables.length === 0,
      existingTables,
      missingTables,
    };
  }

  /**
   * Test database connection
   */
  static async testConnection(config: MySQLConfig): Promise<{
    success: boolean;
    message: string;
    tables?: string[];
    count?: number;
  }> {
    const result = await this.listTables(config);

    if (result.success) {
      return {
        success: true,
        message: `Successfully connected to database "${result.database}". Found ${result.count || 0} tables.`,
        tables: result.data,
        count: result.count,
      };
    }

    return {
      success: false,
      message: result.message || 'Connection failed',
    };
  }

  /**
   * Create a table from SQL statement
   */
  static async createTable(
    config: MySQLConfig,
    sql: string
  ): Promise<{
    success: boolean;
    message: string;
    table?: string;
    table_exists?: boolean;
    sql_executed?: string;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({
        action: 'create_table',
        sqlhost: config.sqlhost,
        sqlun: config.sqlun,
        sqlpw: config.sqlpw,
        sqldb: config.sqldb,
      });

      if (config.sqlport) {
        params.append('sqlport', config.sqlport.toString());
      }

      if (config.sqlcharset) {
        params.append('sqlcharset', config.sqlcharset);
      }

      // Normalize SQL - convert multi-line to single line
      // The API expects SQL on a single line
      const normalizedSQL = sql
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('--'))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const response = await fetch(`${MYSQL_API_URL}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: normalizedSQL }),
      });

      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text();
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData.error || '';
        } catch {
          // If response is not JSON, use the text directly
          if (responseText) {
            errorMessage = responseText.substring(0, 500); // Limit error text length
            errorDetails = responseText;
          }
        }
        
        console.error('Table creation error:', {
          status: response.status,
          message: errorMessage,
          error: errorDetails,
          sql: normalizedSQL.substring(0, 100) + '...',
        });
        
        return {
          success: false,
          message: errorMessage,
          error: errorDetails || `HTTP ${response.status}`,
        };
      }

      // Parse successful response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          success: false,
          message: 'Invalid JSON response from API',
          error: responseText.substring(0, 200),
        };
      }

      if (data.success) {
        return {
          success: true,
          message: data.message || 'Table created successfully',
          table: data.table,
          table_exists: data.table_exists,
          sql_executed: data.sql_executed,
        };
      }

      return {
        success: false,
        message: data.message || 'Failed to create table',
        error: data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create table',
        error: error.toString(),
      };
    }
  }

  /**
   * Create multiple tables
   */
  static async createTables(
    config: MySQLConfig,
    sqlStatements: string[]
  ): Promise<{
    success: boolean;
    results: Array<{
      success: boolean;
      message: string;
      table?: string;
      error?: string;
    }>;
    total: number;
    succeeded: number;
    failed: number;
  }> {
    const results = await Promise.all(
      sqlStatements.map(async (sql) => {
        const result = await this.createTable(config, sql);
        return {
          success: result.success,
          message: result.message,
          table: result.table,
          error: result.error,
        };
      })
    );

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      success: failed === 0,
      results,
      total: results.length,
      succeeded,
      failed,
    };
  }
}

// Default configuration - now imported from mysqlApi.ts to avoid duplication
// This export is kept for backward compatibility

// Required tables for the application (all with homebound_ prefix)
export const REQUIRED_TABLES = [
  'homebound_script',
  'homebound_list_id_config',
  'homebound_qualification_form_fields',
  'homebound_user_groups',
  'homebound_zapier_settings',
  'homebound_app_settings',
  'homebound_script_question_alts',
  'homebound_spiel_alts',
  'homebound_objection_alts',
  'homebound_script_submissions',
];

/**
 * Get CREATE TABLE SQL statement for a specific table
 */
export function getTableSQL(tableName: string): string | null {
  const tableDefinitions: Record<string, string> = {
    'homebound_script': `CREATE TABLE IF NOT EXISTS \`homebound_script\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`step_name\` varchar(255) NOT NULL, \`title\` text NOT NULL, \`content\` text NOT NULL, \`button_config\` longtext DEFAULT NULL, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`step_name\` (\`step_name\`), KEY \`idx_step_name\` (\`step_name\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_list_id_config': `CREATE TABLE IF NOT EXISTS \`homebound_list_id_config\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`list_id\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`step_name\` varchar(255) DEFAULT NULL, \`title\` text DEFAULT NULL, \`content\` text NOT NULL DEFAULT '', \`properties\` longtext DEFAULT NULL, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_list_step\` (\`list_id\`,\`step_name\`), KEY \`idx_list_id\` (\`list_id\`), KEY \`idx_step_name\` (\`step_name\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_qualification_form_fields': `CREATE TABLE IF NOT EXISTS \`homebound_qualification_form_fields\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`field_name\` varchar(255) NOT NULL, \`field_label\` varchar(255) NOT NULL, \`field_type\` varchar(50) NOT NULL, \`field_section\` varchar(50) NOT NULL, \`field_options\` longtext DEFAULT NULL, \`is_required\` tinyint(1) DEFAULT 1, \`zapier_field_name\` varchar(255) DEFAULT NULL, \`placeholder\` varchar(255) DEFAULT NULL, \`help_text\` text DEFAULT NULL, \`validation_rules\` longtext DEFAULT NULL, \`display_order\` int(11) DEFAULT 0, \`is_active\` tinyint(1) DEFAULT 1, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`field_name\` (\`field_name\`), KEY \`idx_field_section\` (\`field_section\`), KEY \`idx_display_order\` (\`display_order\`), KEY \`idx_is_active\` (\`is_active\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_user_groups': `CREATE TABLE IF NOT EXISTS \`homebound_user_groups\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`user_identifier\` varchar(255) NOT NULL, \`group_type\` enum('inbound','outbound') NOT NULL DEFAULT 'inbound', \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`user_identifier\` (\`user_identifier\`), KEY \`idx_user_identifier\` (\`user_identifier\`), KEY \`idx_group_type\` (\`group_type\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_zapier_settings': `CREATE TABLE IF NOT EXISTS \`homebound_zapier_settings\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`webhook_url\` varchar(500) NOT NULL, \`webhook_name\` varchar(255) DEFAULT NULL, \`description\` text DEFAULT NULL, \`is_active\` tinyint(1) DEFAULT 1, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`webhook_url\` (\`webhook_url\`), KEY \`idx_is_active\` (\`is_active\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_app_settings': `CREATE TABLE IF NOT EXISTS \`homebound_app_settings\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`setting_key\` varchar(255) NOT NULL, \`setting_value\` text NOT NULL, \`setting_type\` enum('string','boolean','number','json') NOT NULL DEFAULT 'string', \`description\` text DEFAULT NULL, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`setting_key\` (\`setting_key\`), KEY \`idx_setting_type\` (\`setting_type\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_script_question_alts': `CREATE TABLE IF NOT EXISTS \`homebound_script_question_alts\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(50) NOT NULL, \`question_id\` varchar(100) NOT NULL, \`alt_text\` text NOT NULL, \`alt_order\` int(11) NOT NULL DEFAULT 0, \`is_default\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_script_question_order\` (\`script_name\`, \`question_id\`, \`alt_order\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_question_id\` (\`question_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_spiel_alts': `CREATE TABLE IF NOT EXISTS \`homebound_spiel_alts\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(100) NOT NULL, \`spiel_id\` varchar(100) NOT NULL, \`alt_text\` text NOT NULL, \`alt_order\` int(11) NOT NULL DEFAULT 0, \`is_default\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_script_spiel_order\` (\`script_name\`, \`spiel_id\`, \`alt_order\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_spiel_id\` (\`spiel_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_objection_alts': `CREATE TABLE IF NOT EXISTS \`homebound_objection_alts\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(100) NOT NULL, \`objection_id\` varchar(100) NOT NULL, \`alt_text\` text NOT NULL, \`alt_order\` int(11) NOT NULL DEFAULT 0, \`is_default\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_script_objection_order\` (\`script_name\`, \`objection_id\`, \`alt_order\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_objection_id\` (\`objection_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'homebound_script_submissions': `CREATE TABLE IF NOT EXISTS \`homebound_script_submissions\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(100) NOT NULL COMMENT 'e.g., inbound_greeting, outbound_closingSuccess', \`spiel_id\` varchar(100) NOT NULL COMMENT 'Identifier for the base spiel, e.g., spiel_0', \`objection_id\` varchar(100) DEFAULT NULL COMMENT 'For objection submissions', \`submission_type\` enum('spiel','objection') NOT NULL COMMENT 'Type of script submission', \`alt_text\` text NOT NULL COMMENT 'The submitted script text', \`alt_order\` int(11) DEFAULT 1 COMMENT 'Order of this alternative (1-based)', \`submitted_by\` varchar(100) NOT NULL COMMENT 'User ID who submitted this', \`status\` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Submission status', \`approved_by\` varchar(100) DEFAULT NULL COMMENT 'User ID who approved/rejected', \`approved_at\` datetime DEFAULT NULL COMMENT 'When it was approved/rejected', \`rejection_reason\` text DEFAULT NULL COMMENT 'Reason for rejection if rejected', \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_submitted_by\` (\`submitted_by\`), KEY \`idx_status\` (\`status\`), KEY \`idx_script_status\` (\`script_name\`,\`status\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User-submitted scripts awaiting approval';`,
  };

  return tableDefinitions[tableName] || null;
}

/**
 * Generate CREATE TABLE SQL statements for missing tables
 */
export function generateCreateTableSQL(missingTables: string[]): string {
  const sqlStatements = missingTables
    .map(table => getTableSQL(table))
    .filter((sql): sql is string => sql !== null);

  return sqlStatements.join('\n\n');
}

/**
 * Get SQL statements for multiple tables as an array
 */
export function getTableSQLStatements(tableNames: string[]): string[] {
  return tableNames
    .map(table => getTableSQL(table))
    .filter((sql): sql is string => sql !== null);
}

