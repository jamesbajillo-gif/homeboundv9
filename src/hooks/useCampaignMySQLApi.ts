import { useMemo } from 'react';
import { MySQLApiClient } from '@/lib/mysqlApi';
import { useCampaign, getCampaignTableName } from '@/contexts/CampaignContext';

/**
 * Hook to get a campaign-aware MySQLApiClient instance
 * This instance automatically prefixes table names with the campaign prefix
 * and loads campaign-specific database configurations
 */
export function useCampaignMySQLApi(): MySQLApiClient {
  const { campaign } = useCampaign();

  const apiClient = useMemo(() => {
    return new MySQLApiClient(undefined, undefined, campaign);
  }, [campaign]);

  return apiClient;
}

/**
 * Hook to get campaign-aware table name
 * @param baseTableName - Base table name without prefix (e.g., 'script', 'list_id_config')
 * @returns Campaign-prefixed table name (e.g., 'homebound_script', 'tmdebt_script')
 */
export function useCampaignTableName(baseTableName: string): string {
  const { campaign } = useCampaign();
  return getCampaignTableName(campaign, baseTableName);
}

