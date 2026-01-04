import { Campaign } from '@/contexts/CampaignContext';
import { MySQLConfig } from './mysqlApi';

/**
 * Campaign-specific configuration storage utilities
 */

/**
 * Get localStorage key for campaign-specific config
 */
function getCampaignStorageKey(campaign: Campaign, key: string): string {
  return `${campaign}_${key}`;
}

/**
 * Get campaign-specific MySQL configuration from localStorage
 */
export function getCampaignMySQLConfig(campaign: Campaign): Partial<MySQLConfig> | null {
  try {
    const key = getCampaignStorageKey(campaign, 'mysql_config');
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Error loading MySQL config for campaign ${campaign}:`, error);
  }
  return null;
}

/**
 * Save campaign-specific MySQL configuration to localStorage
 */
export function saveCampaignMySQLConfig(campaign: Campaign, config: Partial<MySQLConfig>): void {
  try {
    const key = getCampaignStorageKey(campaign, 'mysql_config');
    localStorage.setItem(key, JSON.stringify(config));
  } catch (error) {
    console.error(`Error saving MySQL config for campaign ${campaign}:`, error);
  }
}

/**
 * Get campaign-specific setting from localStorage
 */
export function getCampaignSetting<T = any>(campaign: Campaign, key: string): T | null {
  try {
    const storageKey = getCampaignStorageKey(campaign, key);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Error loading setting ${key} for campaign ${campaign}:`, error);
  }
  return null;
}

/**
 * Save campaign-specific setting to localStorage
 */
export function saveCampaignSetting<T = any>(campaign: Campaign, key: string, value: T): void {
  try {
    const storageKey = getCampaignStorageKey(campaign, key);
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving setting ${key} for campaign ${campaign}:`, error);
  }
}

/**
 * Remove campaign-specific setting from localStorage
 */
export function removeCampaignSetting(campaign: Campaign, key: string): void {
  try {
    const storageKey = getCampaignStorageKey(campaign, key);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Error removing setting ${key} for campaign ${campaign}:`, error);
  }
}

/**
 * Get all campaign-specific settings keys
 */
export function getCampaignSettingsKeys(campaign: Campaign): string[] {
  const prefix = `${campaign}_`;
  const keys: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        // Remove the campaign prefix to get the base key
        const baseKey = key.substring(prefix.length);
        keys.push(baseKey);
      }
    }
  } catch (error) {
    console.error(`Error getting settings keys for campaign ${campaign}:`, error);
  }
  
  return keys;
}

