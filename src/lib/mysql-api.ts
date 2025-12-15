/**
 * MySQL REST API Client
 * Wrapper for http://db.techpinoy.com/api/api.php
 */

const API_BASE_URL = 'http://db.techpinoy.com/api/api.php';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch all records from a table
 */
export const fetchAll = async <T = any>(table: string): Promise<T[]> => {
  const response = await fetch(`${API_BASE_URL}?table=${encodeURIComponent(table)}`);
  const result: ApiResponse<T[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch data');
  }
  
  return result.data || [];
};

/**
 * Fetch a single record by ID
 */
export const fetchById = async <T = any>(table: string, id: string | number): Promise<T | null> => {
  const response = await fetch(`${API_BASE_URL}?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`);
  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch record');
  }
  
  return result.data || null;
};

/**
 * Fetch records with a WHERE clause (custom extension)
 * Falls back to fetching all and filtering client-side
 */
export const fetchWhere = async <T extends Record<string, any> = any>(
  table: string, 
  conditions: Record<string, any>
): Promise<T[]> => {
  // Fetch all records and filter client-side
  const allRecords = await fetchAll<T>(table);
  
  return allRecords.filter(record => {
    return Object.entries(conditions).every(([key, value]) => {
      return record[key] === value;
    });
  });
};

/**
 * Fetch a single record matching conditions
 */
export const fetchOneWhere = async <T extends Record<string, any> = any>(
  table: string, 
  conditions: Record<string, any>
): Promise<T | null> => {
  const records = await fetchWhere<T>(table, conditions);
  return records[0] || null;
};

/**
 * Create a new record
 */
export const create = async <T = any>(table: string, data: Record<string, any>): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}?table=${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });
  
  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create record');
  }
  
  return result.data as T;
};

/**
 * Update an existing record
 */
export const update = async <T = any>(
  table: string, 
  id: string | number, 
  data: Record<string, any>
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}?table=${encodeURIComponent(table)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, data }),
  });
  
  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update record');
  }
  
  return result.data as T;
};

/**
 * Delete a record
 */
export const deleteRecord = async (table: string, id: string | number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}?table=${encodeURIComponent(table)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });
  
  const result: ApiResponse = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete record');
  }
};

/**
 * MySQL API client object for convenience
 */
export const mysqlApi = {
  fetchAll,
  fetchById,
  fetchWhere,
  fetchOneWhere,
  create,
  update,
  delete: deleteRecord,
};

export default mysqlApi;
