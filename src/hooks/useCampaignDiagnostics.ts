import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Campaign } from '@/contexts/CampaignContext';
import { mysqlApi } from '@/lib/mysqlApi';
import { MySQLTableApiClient, DEFAULT_MYSQL_CONFIG } from '@/lib/mysqlTableApi';
import { getRequiredTablesForCampaign, BaseTableName, BASE_TABLE_NAMES } from '@/lib/campaignSchema';

export interface TableStatus {
  tableName: string;
  baseTable: BaseTableName;
  exists: boolean;
  recordCount: number | null;
  error?: string;
}

export interface CampaignDiagnostics {
  campaign: Campaign;
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  tables: TableStatus[];
  missingTables: string[];
  emptyTables: string[];
  totalTables: number;
  existingTables: number;
  totalRecords: number;
}

export function useCampaignDiagnostics(campaign: Campaign) {
  const [isCreatingTables, setIsCreatingTables] = useState(false);

  // Check table existence and get record counts
  const { data: diagnostics, isLoading, error, refetch } = useQuery<CampaignDiagnostics>({
    queryKey: ['campaign-diagnostics', campaign],
    queryFn: async () => {
      const requiredTables = getRequiredTablesForCampaign(campaign);
      
      // First, test connection
      let connectionStatus: 'connected' | 'disconnected' = 'disconnected';
      try {
        const connectionTest = await MySQLTableApiClient.testConnection(DEFAULT_MYSQL_CONFIG);
        connectionStatus = connectionTest.success ? 'connected' : 'disconnected';
      } catch (error) {
        connectionStatus = 'disconnected';
      }

      // Get list of all tables in database
      const tableListResult = await MySQLTableApiClient.listTables(DEFAULT_MYSQL_CONFIG);
      const existingTableNames = tableListResult.success ? (tableListResult.data || []) : [];

      // Check each required table
      const tableStatuses: TableStatus[] = [];
      let totalRecords = 0;

      for (const baseTable of BASE_TABLE_NAMES) {
        // Find the full table name with campaign prefix
        const fullTableName = requiredTables.find(t => {
          // Match table name ending with baseTable (e.g., tmdebt_script matches script)
          const baseName = t.split('_').slice(1).join('_'); // Remove prefix
          return baseName === baseTable;
        }) || `${campaign}_${baseTable}`;
        const exists = existingTableNames.includes(fullTableName);
        
        let recordCount: number | null = null;
        let error: string | undefined;

        if (exists) {
          try {
            // Get record count
            const records = await mysqlApi.getAll(fullTableName, { limit: 1 });
            // Try to get actual count with a count query
            try {
              // Use a simple query to estimate count (get all and count client-side for now)
              // In production, you might want to add a COUNT endpoint to the API
              const allRecords = await mysqlApi.getAll(fullTableName);
              recordCount = allRecords.length;
              totalRecords += recordCount;
            } catch (countError: any) {
              // If count fails, try to at least check if table has any records
              recordCount = records.length > 0 ? 1 : 0; // At least we know it's not empty
            }
          } catch (queryError: any) {
            error = queryError.message || 'Failed to query table';
            recordCount = null;
          }
        }

        tableStatuses.push({
          tableName: fullTableName,
          baseTable,
          exists,
          recordCount,
          error,
        });
      }

      const missingTables = tableStatuses.filter(t => !t.exists).map(t => t.tableName);
      const emptyTables = tableStatuses.filter(t => t.exists && (t.recordCount === null || t.recordCount === 0)).map(t => t.tableName);

      return {
        campaign,
        connectionStatus,
        tables: tableStatuses,
        missingTables,
        emptyTables,
        totalTables: requiredTables.length,
        existingTables: tableStatuses.filter(t => t.exists).length,
        totalRecords,
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Create missing tables
  const createMissingTables = async () => {
    if (!diagnostics || isCreatingTables) return;

    setIsCreatingTables(true);
    try {
      const { getTableSQL } = await import('@/lib/mysqlTableApi');
      const missingTableNames = diagnostics.missingTables;
      const results: Array<{ table: string; success: boolean; message: string }> = [];

      for (const tableName of missingTableNames) {
        // Extract base table name (remove campaign prefix)
        const baseTable = tableName.replace(/^(homebound_|tmdebt_)/, '') as BaseTableName;
        // Get SQL with tmdebt_ prefix first (this is the template)
        const sql = getTableSQL(`tmdebt_${baseTable}`);
        
        if (!sql) {
          results.push({
            table: tableName,
            success: false,
            message: `No SQL definition found for ${baseTable}`,
          });
          continue;
        }

        // Replace prefix with campaign prefix
        let finalSQL = sql;
        if (campaign === 'homebound') {
          finalSQL = sql.replace(/`tmdebt_/g, '`homebound_');
        }

        const result = await MySQLTableApiClient.createTable(DEFAULT_MYSQL_CONFIG, finalSQL);
        results.push({
          table: tableName,
          success: result.success,
          message: result.message || (result.success ? 'Created successfully' : 'Failed to create'),
        });
      }

      // Refetch diagnostics after creation
      await refetch();

      return {
        success: results.every(r => r.success),
        results,
      };
    } catch (error: any) {
      console.error('Error creating tables:', error);
      throw error;
    } finally {
      setIsCreatingTables(false);
    }
  };

  return {
    diagnostics,
    isLoading,
    error,
    refetch,
    createMissingTables,
    isCreatingTables,
  };
}

