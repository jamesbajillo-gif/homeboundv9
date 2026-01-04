import { Campaign, getCampaignTableName } from '@/contexts/CampaignContext';
import { getCampaignMySQLConfig } from './campaignConfig';
import { getTableSQL, MySQLTableApiClient } from './mysqlTableApi';

// Load API URL from environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.techpinoy.net/mysqlapi.php';

// Default MySQL configuration from .env (can be overridden via URL parameters or localStorage)
// Priority: Constructor > URL Parameters > localStorage > .env defaults
export const DEFAULT_DB_CONFIG: MySQLConfig = {
  sqlhost: import.meta.env.VITE_DB_HOST || 'vici-lp1.itsbuzzmarketing.com',
  sqlun: import.meta.env.VITE_DB_USER || 'jamesph',
  sqlpw: import.meta.env.VITE_DB_PASS || 'd3cipl3s',
  sqldb: import.meta.env.VITE_DB_NAME || 'dynamicscript',
  sqlport: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
  sqlcharset: import.meta.env.VITE_DB_CHARSET || 'utf8mb4',
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MySQLConfig {
  sqlhost: string;
  sqlun: string;
  sqlpw: string;
  sqldb: string;
  sqlport?: number;
  sqlcharset?: string;
}

export class MySQLApiClient {
  private baseUrl: string;
  private dbConfig: MySQLConfig;
  private campaign?: Campaign;

  constructor(
    baseUrl: string = API_BASE_URL, 
    dbConfig?: Partial<MySQLConfig>,
    campaign?: Campaign
  ) {
    this.baseUrl = baseUrl;
    this.campaign = campaign;
    
    // Load config with priority: Constructor > URL Params > localStorage > .env defaults
    const urlConfig = this.loadConfigFromURL();
    const storedConfig = this.loadConfigFromStorage();
    
    // Also check for API URL override in URL params
    const urlApiUrl = this.getApiUrlFromURL();
    if (urlApiUrl) {
      this.baseUrl = urlApiUrl;
    }
    
    this.dbConfig = { 
      ...DEFAULT_DB_CONFIG,      // .env defaults (lowest priority)
      ...storedConfig,            // localStorage (medium priority)
      ...urlConfig,               // URL parameters (higher priority)
      ...dbConfig                 // Constructor (highest priority)
    };
  }

  /**
   * Get campaign from URL if not set in constructor
   * This allows the global mysqlApi instance to be campaign-aware
   * Priority: Constructor > URL Parameter > Settings Override > Default Campaign > tmdebt
   * 
   * Note: URL parameter takes precedence over settings override to ensure URL-based campaign selection works
   */
  private getCampaign(): Campaign {
    // If campaign was set in constructor, use it
    if (this.campaign) {
      return this.campaign;
    }
    
    // Check URL parameter FIRST (can override settings and default)
    // This ensures ?campaign=homebound always works, even if settings_campaign is set
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const campaignParam = searchParams.get('campaign');
      
      if (campaignParam) {
        const normalizedParam = campaignParam.toLowerCase().trim();
        
        // Direct campaign names
        if (normalizedParam === 'homebound' || normalizedParam === 'tmdebt') {
          return normalizedParam;
        }
        
        // Try to use cached mappings from localStorage
        try {
          const cachedMappingsKey = 'tmdebt_campaign_mappings_cache';
          const cachedMappings = localStorage.getItem(cachedMappingsKey);
          
          if (cachedMappings) {
            const mappings = JSON.parse(cachedMappings);
            if (Array.isArray(mappings)) {
              const mapping = mappings.find(
                (m: { campaign_variable: string; campaign_prefix: Campaign }) =>
                  m.campaign_variable.toLowerCase() === normalizedParam
              );
              if (mapping) {
                return mapping.campaign_prefix;
              }
            }
          }
        } catch (e) {
          // Ignore localStorage errors
        }
        
        // Fallback to default mappings
        const defaultMappings: Array<{ campaign_variable: string; campaign_prefix: Campaign }> = [
          { campaign_variable: 'homebound', campaign_prefix: 'homebound' },
          { campaign_variable: 'hbl_camp', campaign_prefix: 'homebound' },
          { campaign_variable: 'tmdebt', campaign_prefix: 'tmdebt' },
          { campaign_variable: 'tm_debt', campaign_prefix: 'tmdebt' },
        ];
        
        const mapping = defaultMappings.find(
          m => m.campaign_variable.toLowerCase() === normalizedParam
        );
        if (mapping) {
          return mapping.campaign_prefix;
        }
      }
    }
    
    // Check for settings override (for settings page when no URL parameter)
    if (typeof window !== 'undefined') {
      try {
        const settingsCampaign = localStorage.getItem('settings_campaign');
        if (settingsCampaign === 'homebound' || settingsCampaign === 'tmdebt') {
          return settingsCampaign;
        }
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    // Check user's default campaign preference
    if (typeof window !== 'undefined') {
      try {
        const defaultCampaign = localStorage.getItem('default_campaign');
        if (defaultCampaign === 'homebound' || defaultCampaign === 'tmdebt') {
          return defaultCampaign;
        }
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    // Default to tmdebt
    return 'tmdebt';
  }

  /**
   * Load database configuration from URL parameters
   * Allows overriding .env defaults via URL: ?db_host=...&db_user=...&db_pass=...&db_name=...
   * Priority: URL params can override localStorage and .env defaults
   */
  private loadConfigFromURL(): Partial<MySQLConfig> {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlConfig: Partial<MySQLConfig> = {};

      // Check for database configuration parameters in URL
      // Format: ?db_host=...&db_user=...&db_pass=...&db_name=...&db_port=...&db_charset=...
      const dbHost = searchParams.get('db_host');
      const dbUser = searchParams.get('db_user');
      const dbPass = searchParams.get('db_pass');
      const dbName = searchParams.get('db_name');
      const dbPort = searchParams.get('db_port');
      const dbCharset = searchParams.get('db_charset');

      if (dbHost) urlConfig.sqlhost = dbHost;
      if (dbUser) urlConfig.sqlun = dbUser;
      if (dbPass) urlConfig.sqlpw = dbPass;
      if (dbName) urlConfig.sqldb = dbName;
      if (dbPort) urlConfig.sqlport = parseInt(dbPort);
      if (dbCharset) urlConfig.sqlcharset = dbCharset;

      return urlConfig;
    } catch (error) {
      console.error('Error loading config from URL:', error);
      return {};
    }
  }

  /**
   * Get API URL from URL parameters (if provided)
   */
  private getApiUrlFromURL(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('api_url');
    } catch (error) {
      return null;
    }
  }

  /**
   * Load database configuration from localStorage
   * If campaign is set, loads campaign-specific config first, then falls back to default
   */
  private loadConfigFromStorage(): Partial<MySQLConfig> {
    // Get campaign (from constructor or URL)
    const campaign = this.getCampaign();
    
    // Try to load campaign-specific config first
    const campaignConfig = getCampaignMySQLConfig(campaign);
    if (campaignConfig) {
      return campaignConfig;
    }

    // Fall back to default config key (for backward compatibility)
    try {
      const saved = localStorage.getItem('tmdebt_mysql_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading MySQL config from storage:', error);
    }
    return {};
  }

  /**
   * Get campaign-aware table name
   * If campaign is set, prefixes table name with campaign prefix
   */
  private getTableName(table: string): string {
    const campaign = this.getCampaign();
    return getCampaignTableName(campaign, table);
  }

  /**
   * Extract base table name (remove campaign prefix if present)
   * Used to get the SQL definition for a table
   */
  private getBaseTableName(table: string): string {
    // Remove any campaign prefix (homebound_ or tmdebt_)
    return table.replace(/^(homebound_|tmdebt_)/, '');
  }

  /**
   * Check if an error indicates a missing table
   */
  private isTableMissingError(error: string | Error): boolean {
    const errorMsg = typeof error === 'string' ? error : error.message || '';
    const errorLower = errorMsg.toLowerCase();
    return (
      (errorLower.includes('table') && 
       (errorLower.includes("doesn't exist") || 
        errorLower.includes('not found') ||
        errorLower.includes('unknown table') ||
        errorLower.includes('table doesn\'t exist'))) ||
      errorLower.includes('1146') || // MySQL error code for table doesn't exist
      errorLower.includes('42s02')   // SQLSTATE for base table not found
    );
  }

  /**
   * Automatically create a missing table
   * Returns true if table was created successfully, false otherwise
   */
  private async autoCreateTable(table: string): Promise<boolean> {
    try {
      const baseTableName = this.getBaseTableName(table);
      const sql = getTableSQL(baseTableName);
      
      if (!sql) {
        console.warn(`No SQL definition found for table: ${baseTableName}`);
        return false;
      }

      // Apply campaign prefix to the SQL if needed
      const campaign = this.getCampaign();
      let finalSQL = sql;
      
      // Replace table name in SQL with the campaign-prefixed version
      if (campaign === 'homebound' && sql.includes('tmdebt_')) {
        finalSQL = sql.replace(/`tmdebt_/g, '`homebound_');
      } else if (campaign === 'tmdebt' && sql.includes('homebound_')) {
        finalSQL = sql.replace(/`homebound_/g, '`tmdebt_');
      } else if (campaign === 'homebound') {
        // If SQL doesn't have prefix, add homebound_ prefix
        finalSQL = sql.replace(/`([a-z_]+)`/g, (match, tableName) => {
          if (!tableName.startsWith('homebound_') && !tableName.startsWith('tmdebt_')) {
            return `\`homebound_${tableName}\``;
          }
          return match;
        });
      }

      console.log(`Auto-creating missing table: ${table}`);
      const result = await MySQLTableApiClient.createTable(this.dbConfig, finalSQL);
      
      if (result.success) {
        console.log(`Successfully created table: ${table}`);
        return true;
      } else {
        console.error(`Failed to create table ${table}:`, result.message);
        return false;
      }
    } catch (error: any) {
      console.error(`Error auto-creating table ${table}:`, error);
      return false;
    }
  }

  /**
   * Handle table missing errors by auto-creating the table
   * Returns true if table was created and operation should be retried
   */
  private async handleTableMissingError(table: string, error: string | Error): Promise<boolean> {
    if (!this.isTableMissingError(error)) {
      return false;
    }

    console.warn(`Table missing detected: ${table}. Attempting auto-creation...`);
    return await this.autoCreateTable(table);
  }

  /**
   * Build query parameters with database credentials
   */
  private buildParams(additionalParams: Record<string, string> = {}): URLSearchParams {
    const params = new URLSearchParams({
      sqlhost: this.dbConfig.sqlhost,
      sqlun: this.dbConfig.sqlun,
      sqlpw: this.dbConfig.sqlpw,
      sqldb: this.dbConfig.sqldb,
      ...additionalParams,
    });

    if (this.dbConfig.sqlport) {
      params.append('sqlport', this.dbConfig.sqlport.toString());
    }
    if (this.dbConfig.sqlcharset) {
      params.append('sqlcharset', this.dbConfig.sqlcharset);
    }

    return params;
  }

  /**
   * Fetch all records from a table (with optional filtering, sorting, pagination)
   * Automatically creates missing tables if detected
   */
  async getAll<T = any>(
    table: string,
    options?: {
      where?: Record<string, any>;
      orderBy?: string;
      order?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
      fields?: string[];
      autoCreateTable?: boolean; // Enable auto-creation (default: true)
    }
  ): Promise<T[]> {
    const campaignTable = this.getTableName(table);
    const autoCreate = options?.autoCreateTable !== false; // Default to true
    
    const executeQuery = async (): Promise<T[]> => {
      const params = this.buildParams({
        action: 'select',
        table: campaignTable,
      });
      
      if (options?.where) {
        params.append('where', JSON.stringify(options.where));
      }
      if (options?.orderBy) {
        // orderBy should be a JSON object like {"field": "ASC|DESC"}
        // If orderBy is a string, convert it to JSON object format
        if (typeof options.orderBy === 'string') {
          const orderObj = { [options.orderBy]: options.order || 'ASC' };
          params.append('orderBy', JSON.stringify(orderObj));
        } else {
          params.append('orderBy', JSON.stringify(options.orderBy));
        }
      }
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options?.offset) {
        params.append('offset', options.offset.toString());
      }
      if (options?.fields) {
        params.append('fields', options.fields.join(','));
      }

      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}?${params}`);
      } catch (error: any) {
        // Handle network errors (including CORS)
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          throw new Error('Network error: Unable to connect to server. Please check CORS configuration or network connection.');
        }
        throw error;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        const error = new Error(errorData.message || errorData.error || 'Failed to fetch records');
        
        // Auto-create table if missing and enabled
        if (autoCreate && await this.handleTableMissingError(campaignTable, error)) {
          // Retry the query after table creation
          return executeQuery();
        }
        
        throw error;
      }
      
      const result: ApiResponse<T[]> = await response.json();
      
      if (!result.success) {
        const error = new Error(result.error || result.message || 'Failed to fetch records');
        
        // Auto-create table if missing and enabled
        if (autoCreate && await this.handleTableMissingError(campaignTable, error)) {
          // Retry the query after table creation
          return executeQuery();
        }
        
        throw error;
      }
      
      return result.data || [];
    };

    return executeQuery();
  }

  /**
   * Fetch records by field value (replaces .eq() in Supabase)
   */
  async findByField<T = any>(
    table: string,
    field: string,
    value: any,
    options?: { orderBy?: string; order?: 'ASC' | 'DESC' }
  ): Promise<T[]> {
    return this.getAll<T>(table, {
      where: { [field]: value },
      ...options
    });
  }

  /**
   * Fetch multiple records where field matches any value in array (replaces .in() in Supabase)
   */
  async findByFieldIn<T = any>(
    table: string,
    field: string,
    values: any[],
    options?: { orderBy?: string; order?: 'ASC' | 'DESC' }
  ): Promise<T[]> {
    if (values.length === 0) return [];
    
    // Fetch all records and filter client-side
    // Note: This is less efficient for large datasets, but works with current API
    // TODO: Add OR support to API for better performance
    const allRecords = await this.getAll<T>(table, options);
    return allRecords.filter((record: any) => 
      values.includes(record[field])
    );
  }

  /**
   * Get single record by field (replaces .maybeSingle())
   */
  async findOneByField<T = any>(
    table: string,
    field: string,
    value: any
  ): Promise<T | null> {
    const records = await this.findByField<T>(table, field, value);
    return records.length > 0 ? records[0] : null;
  }

  /**
   * Create a new record
   * Automatically creates missing tables if detected
   */
  async create<T = any>(table: string, data: Partial<T>, options?: { autoCreateTable?: boolean }): Promise<number> {
    const campaignTable = this.getTableName(table);
    const autoCreate = options?.autoCreateTable !== false; // Default to true
    
    // Remove 'id' field to prevent conflicts with AUTO_INCREMENT primary keys
    // Create a clean copy without the id field
    const cleanData = { ...data };
    delete (cleanData as any).id;
    
    const executeCreate = async (): Promise<number> => {
      const params = this.buildParams({
        action: 'insert',
        table: campaignTable,
      });

      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}?${params}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: cleanData }),
        });
      } catch (error: any) {
        // Handle network errors (including CORS)
        if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          throw new Error('Network error: Unable to connect to server. Please check CORS configuration or network connection.');
        }
        throw error;
      }
      
      if (!response.ok) {
        // Try to get detailed error message from API
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorData.error || errorMessage;
          
          // Auto-create table if missing and enabled
          if (autoCreate && await this.handleTableMissingError(campaignTable, errorMessage)) {
            // Retry after table creation
            return executeCreate();
          }
          
          // Include technical details if available
          if (errorData.error && errorData.error !== errorData.message) {
            errorMessage += ` (${errorData.error})`;
          }
        } catch {
          // If JSON parsing fails, try to read as text
          try {
            const textError = await response.text();
            if (textError) {
              // Auto-create table if missing and enabled
              if (autoCreate && await this.handleTableMissingError(campaignTable, textError)) {
                // Retry after table creation
                return executeCreate();
              }
              errorMessage = textError.substring(0, 200); // Limit length
            }
          } catch {
            // Use default error message
          }
        }
        throw new Error(errorMessage);
      }
      
      const result: ApiResponse<any> = await response.json();
      
      if (!result.success) {
        const errorMsg = result.error || result.message || 'Failed to create record';
        
        // Auto-create table if missing and enabled
        if (autoCreate && await this.handleTableMissingError(campaignTable, errorMsg)) {
          // Retry after table creation
          return executeCreate();
        }
        
        throw new Error(errorMsg);
      }
      
      // API returns inserted_ids array - check both root level and data property
      // Documentation shows: { success: true, inserted_ids: [...], inserted_count: N }
      // But some APIs might wrap in data: { inserted_ids: [...] }
      const insertedIds = (result as any).inserted_ids || (result.data as any)?.inserted_ids;
      if (insertedIds && Array.isArray(insertedIds) && insertedIds.length > 0) {
        return insertedIds[0];
      }
      
      throw new Error('No inserted ID returned from API');
    };

    return executeCreate();
  }

  /**
   * Update an existing record by ID
   */
  async updateById<T = any>(
    table: string,
    id: number | string,
    data: Partial<T>
  ): Promise<void> {
    const campaignTable = this.getTableName(table);
    const params = this.buildParams({
      action: 'update',
      table: campaignTable,
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data,
        where: { id } 
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || errorData.error || 'Failed to update record');
    }
    
    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to update record');
    }
  }

  /**
   * Update by field (for step_name updates)
   * Note: This method finds the record first, then updates by ID.
   * For better performance with multiple records, use updateByWhere().
   */
  async updateByField<T = any>(
    table: string,
    field: string,
    value: any,
    data: Partial<T>
  ): Promise<void> {
    // First find the record
    const existing = await this.findOneByField<{ id: number | string }>(table, field, value);
    if (!existing) {
      throw new Error('Record not found');
    }
    // Then update by ID
    await this.updateById(table, existing.id, data);
  }

  /**
   * Update records by WHERE clause (updates all matching records)
   */
  async updateByWhere<T = any>(
    table: string,
    where: Record<string, any>,
    data: Partial<T>
  ): Promise<number> {
    const campaignTable = this.getTableName(table);
    const params = this.buildParams({
      action: 'update',
      table: campaignTable,
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data,
        where 
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || errorData.error || 'Failed to update records');
    }
    
    const result: ApiResponse<{ affected_rows: number }> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to update records');
    }
    
    return result.data!.affected_rows;
  }

  /**
   * Delete a record by ID
   */
  async deleteById(table: string, id: number | string): Promise<void> {
    const campaignTable = this.getTableName(table);
    const params = this.buildParams({
      action: 'delete',
      table: campaignTable,
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        where: { id } 
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || errorData.error || 'Failed to delete record');
    }
    
    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to delete record');
    }
  }

  /**
   * Delete records by WHERE clause (deletes all matching records)
   */
  async deleteByWhere(table: string, where: Record<string, any>): Promise<number> {
    const campaignTable = this.getTableName(table);
    const params = this.buildParams({
      action: 'delete',
      table: campaignTable,
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ where }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || errorData.error || 'Failed to delete records');
    }
    
    const result: ApiResponse<{ affected_rows: number } | number> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to delete records');
    }
    
    // Handle different response structures
    // API might return: { success: true, data: { affected_rows: 5 } }
    // or: { success: true, data: 5 }
    // or: { success: true, affected_rows: 5 }
    if (result.data) {
      if (typeof result.data === 'number') {
        return result.data;
      } else if (typeof result.data === 'object' && 'affected_rows' in result.data) {
        return (result.data as { affected_rows: number }).affected_rows;
      }
    }
    
    // Fallback: check if affected_rows is at the top level
    if ('affected_rows' in result) {
      return (result as any).affected_rows;
    }
    
    // If we can't find affected_rows, return 0 (no rows affected)
    console.warn('Could not determine affected_rows from delete response:', result);
    return 0;
  }

  /**
   * Upsert a record (insert or update based on unique constraints)
   * Note: The API automatically detects unique keys. The data object should include the unique key fields.
   * @param onConflict - Deprecated: Not used by API, kept for backward compatibility
   * @example upsertByFields('list_id_config', { list_id: 'ABC', step_name: 'greeting', ... })
   */
  async upsertByFields<T = any>(
    table: string,
    data: Partial<T>,
    onConflict?: string // Deprecated but kept for backward compatibility
  ): Promise<number> {
    const campaignTable = this.getTableName(table);
    const params = this.buildParams({
      action: 'upsert',
      table: campaignTable,
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(errorData.message || errorData.error || 'Failed to upsert record');
    }
    
    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to upsert record');
    }
    
    // API returns upserted_ids array - check both root level and data property
    // Documentation shows: { success: true, upserted_ids: [...], upserted_count: N }
    // But some APIs might wrap in data: { upserted_ids: [...] }
    const upsertedIds = (result as any).upserted_ids || (result.data as any)?.upserted_ids;
    if (upsertedIds && Array.isArray(upsertedIds) && upsertedIds.length > 0) {
      return upsertedIds[0];
    }
    
    throw new Error('No upserted ID returned from API');
  }

  /**
   * Find one record by multiple field conditions
   */
  async findOneByFields<T = any>(
    table: string,
    where: Record<string, any>
  ): Promise<T | null> {
    const records = await this.getAll<T>(table, { where });
    return records.length > 0 ? records[0] : null;
  }
}

export const mysqlApi = new MySQLApiClient();

