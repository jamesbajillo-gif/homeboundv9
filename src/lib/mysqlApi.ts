const API_BASE_URL = 'https://api.techpinoy.net/mysqlapi.php';

// Default MySQL configuration (can be overridden)
// This is the single source of truth for default database configuration
export const DEFAULT_DB_CONFIG: MySQLConfig = {
  sqlhost: '167.86.95.115',
  sqlun: 'dynamicscript',
  sqlpw: 'dynamicscript',
  sqldb: 'dynamicscript',
  sqlport: 3306,
  sqlcharset: 'utf8mb4',
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

  constructor(baseUrl: string = API_BASE_URL, dbConfig?: Partial<MySQLConfig>) {
    this.baseUrl = baseUrl;
    // Load config from localStorage if available, otherwise use defaults
    const storedConfig = this.loadConfigFromStorage();
    this.dbConfig = { ...DEFAULT_DB_CONFIG, ...storedConfig, ...dbConfig };
  }

  /**
   * Load database configuration from localStorage
   */
  private loadConfigFromStorage(): Partial<MySQLConfig> {
    try {
      const saved = localStorage.getItem('mysql_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading MySQL config from storage:', error);
    }
    return {};
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
    }
  ): Promise<T[]> {
    const params = this.buildParams({
      action: 'select',
      table,
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
      throw new Error(errorData.message || errorData.error || 'Failed to fetch records');
    }
    
    const result: ApiResponse<T[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to fetch records');
    }
    
    return result.data || [];
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
   */
  async create<T = any>(table: string, data: Partial<T>): Promise<number> {
    const params = this.buildParams({
      action: 'insert',
      table,
    });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
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
        
        // Check if error indicates table doesn't exist
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes('table') && (errorLower.includes("doesn't exist") || errorLower.includes('not found'))) {
          errorMessage = `Table '${table}' does not exist. Please run the database migration: database-migration-script-submissions.sql`;
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
            const errorLower = textError.toLowerCase();
            if (errorLower.includes('table') && (errorLower.includes("doesn't exist") || errorLower.includes('not found'))) {
              errorMessage = `Table '${table}' does not exist. Please run the database migration: database-migration-script-submissions.sql`;
            } else {
              errorMessage = textError.substring(0, 200); // Limit length
            }
          }
        } catch {
          // Use default error message
        }
      }
      throw new Error(errorMessage);
    }
    
    const result: ApiResponse<any> = await response.json();
    
    if (!result.success) {
      // Check if error indicates table doesn't exist
      const errorMsg = result.error || result.message || 'Failed to create record';
      if (errorMsg.toLowerCase().includes('table') && errorMsg.toLowerCase().includes("doesn't exist")) {
        throw new Error(`Table '${table}' does not exist. Please run the database migration: database-migration-script-submissions.sql`);
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
  }

  /**
   * Update an existing record by ID
   */
  async updateById<T = any>(
    table: string,
    id: number | string,
    data: Partial<T>
  ): Promise<void> {
    const params = this.buildParams({
      action: 'update',
      table,
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
    const params = this.buildParams({
      action: 'update',
      table,
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
    const params = this.buildParams({
      action: 'delete',
      table,
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
    const params = this.buildParams({
      action: 'delete',
      table,
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
    
    const result: ApiResponse<{ affected_rows: number }> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Failed to delete records');
    }
    
    return result.data!.affected_rows;
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
    const params = this.buildParams({
      action: 'upsert',
      table,
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

