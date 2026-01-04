/**
 * MySQL Table Listing API Client
 * Integrates with https://api.techpinoy.net/mysqlapi.php
 */

import type { MySQLConfig } from './mysqlApi';

// Use API URL from mysqlApi (supports .env and URL parameter overrides)
// Import API_BASE_URL if exported, otherwise use environment variable
const getApiUrl = (): string => {
  // Check URL parameter first (allows override)
  if (typeof window !== 'undefined') {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const apiUrl = searchParams.get('api_url');
      if (apiUrl) {
        return apiUrl;
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Fall back to environment variable or default
  return import.meta.env.VITE_API_URL || 'https://api.techpinoy.net/mysqlapi.php';
};

const MYSQL_API_URL = getApiUrl();

// Re-export MySQLConfig for convenience
export type { MySQLConfig };

// Default MySQL configuration (same as mysqlApi.ts to avoid circular dependency)
// This is defined here to break the circular dependency with mysqlApi.ts
export const DEFAULT_MYSQL_CONFIG: MySQLConfig = {
  sqlhost: import.meta.env.VITE_DB_HOST || 'vici-lp1.itsbuzzmarketing.com',
  sqlun: import.meta.env.VITE_DB_USER || 'jamesph',
  sqlpw: import.meta.env.VITE_DB_PASS || 'd3cipl3s',
  sqldb: import.meta.env.VITE_DB_NAME || 'dynamicscript',
  sqlport: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
  sqlcharset: import.meta.env.VITE_DB_CHARSET || 'utf8mb4',
};

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
   * Get config with URL parameter overrides
   */
  private static getConfigWithOverrides(config: MySQLConfig): MySQLConfig {
    if (typeof window === 'undefined') {
      return config;
    }

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const overrides: Partial<MySQLConfig> = {};

      const dbHost = searchParams.get('db_host');
      const dbUser = searchParams.get('db_user');
      const dbPass = searchParams.get('db_pass');
      const dbName = searchParams.get('db_name');
      const dbPort = searchParams.get('db_port');
      const dbCharset = searchParams.get('db_charset');

      if (dbHost) overrides.sqlhost = dbHost;
      if (dbUser) overrides.sqlun = dbUser;
      if (dbPass) overrides.sqlpw = dbPass;
      if (dbName) overrides.sqldb = dbName;
      if (dbPort) overrides.sqlport = parseInt(dbPort);
      if (dbCharset) overrides.sqlcharset = dbCharset;

      return { ...config, ...overrides };
    } catch (error) {
      return config;
    }
  }

  /**
   * Get API URL with URL parameter override support
   */
  private static getApiUrl(): string {
    return getApiUrl();
  }

  /**
   * List all tables from a MySQL database
   */
  static async listTables(config: MySQLConfig): Promise<TableListResponse> {
    try {
      const finalConfig = this.getConfigWithOverrides(config);
      const apiUrl = this.getApiUrl();
      
      const params = new URLSearchParams({
        action: 'list_tables',
        sqlhost: finalConfig.sqlhost,
        sqlun: finalConfig.sqlun,
        sqlpw: finalConfig.sqlpw,
        sqldb: finalConfig.sqldb,
      });

      if (finalConfig.sqlport) {
        params.append('sqlport', finalConfig.sqlport.toString());
      }

      if (finalConfig.sqlcharset) {
        params.append('sqlcharset', finalConfig.sqlcharset);
      }

      const response = await fetch(`${apiUrl}?${params.toString()}`);
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
    const finalConfig = this.getConfigWithOverrides(config);
    const result = await this.listTables(finalConfig);

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
    const finalConfig = this.getConfigWithOverrides(config);
    const result = await this.listTables(finalConfig);

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
      const finalConfig = this.getConfigWithOverrides(config);
      const apiUrl = this.getApiUrl();
      
      const params = new URLSearchParams({
        action: 'create_table',
        sqlhost: finalConfig.sqlhost,
        sqlun: finalConfig.sqlun,
        sqlpw: finalConfig.sqlpw,
        sqldb: finalConfig.sqldb,
      });

      if (finalConfig.sqlport) {
        params.append('sqlport', finalConfig.sqlport.toString());
      }

      if (finalConfig.sqlcharset) {
        params.append('sqlcharset', finalConfig.sqlcharset);
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

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
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

// Required tables for the application (all with tmdebt_ prefix)
export const REQUIRED_TABLES = [
  'tmdebt_users',
  'tmdebt_script',
  'tmdebt_list_id_config',
  'tmdebt_qualification_form_fields',
  'tmdebt_user_groups',
  'tmdebt_zapier_settings',
  'tmdebt_app_settings',
  'tmdebt_script_question_alts',
  'tmdebt_spiel_alts',
  'tmdebt_objection_alts',
  'tmdebt_script_submissions',
  'tmdebt_custom_tabs',
  'tmdebt_listid_custom_tabs',
];

/**
 * Get CREATE TABLE SQL statement for a specific table
 */
export function getTableSQL(tableName: string): string | null {
  const tableDefinitions: Record<string, string> = {
    'tmdebt_script': `CREATE TABLE IF NOT EXISTS \`tmdebt_script\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`step_name\` varchar(255) NOT NULL, \`title\` text NOT NULL, \`content\` text NOT NULL, \`button_config\` longtext DEFAULT NULL, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`step_name\` (\`step_name\`), KEY \`idx_step_name\` (\`step_name\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_list_id_config': `CREATE TABLE IF NOT EXISTS \`tmdebt_list_id_config\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`list_id\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`step_name\` varchar(255) DEFAULT NULL, \`title\` text DEFAULT NULL, \`content\` text NOT NULL DEFAULT '', \`properties\` longtext DEFAULT NULL, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_list_step\` (\`list_id\`,\`step_name\`), KEY \`idx_list_id\` (\`list_id\`), KEY \`idx_step_name\` (\`step_name\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_qualification_form_fields': `CREATE TABLE IF NOT EXISTS \`tmdebt_qualification_form_fields\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`field_name\` varchar(255) NOT NULL, \`field_label\` varchar(255) NOT NULL, \`field_type\` varchar(50) NOT NULL, \`field_section\` varchar(50) NOT NULL, \`field_options\` longtext DEFAULT NULL, \`is_required\` tinyint(1) DEFAULT 1, \`zapier_field_name\` varchar(255) DEFAULT NULL, \`placeholder\` varchar(255) DEFAULT NULL, \`help_text\` text DEFAULT NULL, \`validation_rules\` longtext DEFAULT NULL, \`display_order\` int(11) DEFAULT 0, \`is_active\` tinyint(1) DEFAULT 1, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`field_name\` (\`field_name\`), KEY \`idx_field_section\` (\`field_section\`), KEY \`idx_display_order\` (\`display_order\`), KEY \`idx_is_active\` (\`is_active\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_user_groups': `CREATE TABLE IF NOT EXISTS \`tmdebt_user_groups\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`user_identifier\` varchar(255) NOT NULL, \`group_type\` enum('inbound','outbound') NOT NULL DEFAULT 'inbound', \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`user_identifier\` (\`user_identifier\`), KEY \`idx_user_identifier\` (\`user_identifier\`), KEY \`idx_group_type\` (\`group_type\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_zapier_settings': `CREATE TABLE IF NOT EXISTS \`tmdebt_zapier_settings\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`webhook_url\` varchar(500) NOT NULL, \`webhook_name\` varchar(255) DEFAULT NULL, \`description\` text DEFAULT NULL, \`is_active\` tinyint(1) DEFAULT 1, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`webhook_url\` (\`webhook_url\`), KEY \`idx_is_active\` (\`is_active\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_app_settings': `CREATE TABLE IF NOT EXISTS \`tmdebt_app_settings\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`setting_key\` varchar(255) NOT NULL, \`setting_value\` text NOT NULL, \`setting_type\` enum('string','boolean','number','json') NOT NULL DEFAULT 'string', \`description\` text DEFAULT NULL, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`setting_key\` (\`setting_key\`), KEY \`idx_setting_type\` (\`setting_type\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_script_question_alts': `CREATE TABLE IF NOT EXISTS \`tmdebt_script_question_alts\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(50) NOT NULL, \`question_id\` varchar(100) NOT NULL, \`alt_text\` text NOT NULL, \`alt_order\` int(11) NOT NULL DEFAULT 0, \`is_default\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_script_question_order\` (\`script_name\`, \`question_id\`, \`alt_order\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_question_id\` (\`question_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_spiel_alts': `CREATE TABLE IF NOT EXISTS \`tmdebt_spiel_alts\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(100) NOT NULL, \`spiel_id\` varchar(100) NOT NULL, \`alt_text\` text NOT NULL, \`alt_order\` int(11) NOT NULL DEFAULT 0, \`is_default\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_script_spiel_order\` (\`script_name\`, \`spiel_id\`, \`alt_order\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_spiel_id\` (\`spiel_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_objection_alts': `CREATE TABLE IF NOT EXISTS \`tmdebt_objection_alts\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(100) NOT NULL, \`objection_id\` varchar(100) NOT NULL, \`alt_text\` text NOT NULL, \`alt_order\` int(11) NOT NULL DEFAULT 0, \`is_default\` tinyint(1) NOT NULL DEFAULT 0, \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`unique_script_objection_order\` (\`script_name\`, \`objection_id\`, \`alt_order\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_objection_id\` (\`objection_id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    'tmdebt_script_submissions': `CREATE TABLE IF NOT EXISTS \`tmdebt_script_submissions\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`script_name\` varchar(100) NOT NULL COMMENT 'e.g., inbound_greeting, outbound_closingSuccess', \`spiel_id\` varchar(100) NOT NULL COMMENT 'Identifier for the base spiel, e.g., spiel_0', \`objection_id\` varchar(100) DEFAULT NULL COMMENT 'For objection submissions', \`submission_type\` enum('spiel','objection') NOT NULL COMMENT 'Type of script submission', \`alt_text\` text NOT NULL COMMENT 'The submitted script text', \`alt_order\` int(11) DEFAULT 1 COMMENT 'Order of this alternative (1-based)', \`submitted_by\` varchar(100) NOT NULL COMMENT 'User ID who submitted this', \`status\` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'Submission status', \`approved_by\` varchar(100) DEFAULT NULL COMMENT 'User ID who approved/rejected', \`approved_at\` datetime DEFAULT NULL COMMENT 'When it was approved/rejected', \`rejection_reason\` text DEFAULT NULL COMMENT 'Reason for rejection if rejected', \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), KEY \`idx_script_name\` (\`script_name\`), KEY \`idx_submitted_by\` (\`submitted_by\`), KEY \`idx_status\` (\`status\`), KEY \`idx_script_status\` (\`script_name\`,\`status\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User-submitted scripts awaiting approval';`,

    'tmdebt_custom_tabs': `CREATE TABLE IF NOT EXISTS \`tmdebt_custom_tabs\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`tab_key\` varchar(100) NOT NULL, \`tab_title\` varchar(255) NOT NULL, \`group_type\` enum('inbound','outbound') NOT NULL, \`display_order\` int(11) DEFAULT 0, \`is_active\` tinyint(1) DEFAULT 1, \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`tab_key\` (\`tab_key\`), KEY \`idx_group_type\` (\`group_type\`), KEY \`idx_display_order\` (\`display_order\`), KEY \`idx_is_active\` (\`is_active\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom tab configurations for inbound/outbound scripts';`,

    'tmdebt_listid_custom_tabs': `CREATE TABLE IF NOT EXISTS \`tmdebt_listid_custom_tabs\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`list_id\` varchar(255) NOT NULL, \`tab_key\` varchar(100) NOT NULL, \`tab_title\` varchar(255) NOT NULL, \`display_order\` int(11) DEFAULT 0, \`is_active\` tinyint(1) DEFAULT 1, \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP, \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), UNIQUE KEY \`tab_key\` (\`tab_key\`), KEY \`idx_list_id\` (\`list_id\`), KEY \`idx_is_active\` (\`is_active\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom tab configurations for specific List IDs';`,

    'tmdebt_users': `CREATE TABLE IF NOT EXISTS \`tmdebt_users\` (\`id\` int(11) NOT NULL AUTO_INCREMENT, \`user_id\` varchar(255) NOT NULL, \`ip_address\` varchar(45) DEFAULT NULL, \`action\` enum('viewed','modified','added','updated','deleted','selected','cycled','submitted') NOT NULL, \`description\` text NOT NULL, \`spiels_settings\` json DEFAULT NULL, \`metadata\` json DEFAULT NULL, \`user_agent\` text DEFAULT NULL, \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`), KEY \`idx_user_id\` (\`user_id\`), KEY \`idx_action\` (\`action\`), KEY \`idx_created_at\` (\`created_at\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User action history and spiel settings';`,
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

