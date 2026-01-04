/**
 * Migration utilities for moving localStorage data to API
 */

import { MySQLApiClient } from './mysqlApi';

export interface AppSetting {
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'boolean' | 'number' | 'json';
  description?: string;
}

/**
 * Migrate localStorage data to API
 */
export async function migrateLocalStorageToAPI(config?: any): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;
  
  // Use provided config or default API client
  const apiClient = config ? new MySQLApiClient(undefined, config) : new MySQLApiClient();

  // Settings to migrate (excluding tmdebt_mysql_config which should stay in localStorage for security)
  const settingsToMigrate: Array<{
    key: string;
    type: 'string' | 'boolean' | 'number' | 'json';
    description?: string;
  }> = [
    { key: 'tmdebt_debug_mode', type: 'boolean', description: 'Debug mode toggle' },
    { key: 'tmdebt_settings_access_level', type: 'string', description: 'Settings access password' },
    { key: 'tmdebt_seen_keyboard_shortcuts', type: 'boolean', description: 'Whether user has seen keyboard shortcuts' },
  ];

  // Migrate each setting (check both old and new prefixed keys)
  for (const setting of settingsToMigrate) {
    try {
      // Try new prefixed key first, then fallback to old key for backward compatibility
      let value = localStorage.getItem(setting.key);
      if (!value) {
        // Try old key without prefix (for backward compatibility)
        const oldKey = setting.key.replace('tmdebt_', '');
        value = localStorage.getItem(oldKey);
      }
      
      if (value !== null) {
        // Convert value based on type
        let settingValue = value;
        if (setting.type === 'boolean') {
          settingValue = value === 'true' ? '1' : '0';
        } else if (setting.type === 'json') {
          // Keep as JSON string
          settingValue = value;
        }

        // Upsert to API (always use prefixed key)
        await apiClient.upsertByFields(
          'tmdebt_app_settings',
          {
            setting_key: setting.key,
            setting_value: settingValue,
            setting_type: setting.type,
            description: setting.description,
          },
          'setting_key'
        );

        migrated++;
      }
    } catch (error: any) {
      errors.push(`Failed to migrate ${setting.key}: ${error.message}`);
    }
  }

  // Migrate qualification form drafts
  try {
    const draftKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('qualification_form_draft_') || key.startsWith('tmdebt_qualification_form_draft_'))) {
        draftKeys.push(key);
      }
    }

    for (const draftKey of draftKeys) {
      try {
        const value = localStorage.getItem(draftKey);
        if (value) {
          // Extract listId and groupType from key: tmdebt_qualification_form_draft_{listId}_{groupType}
          // Support both old and new prefixed keys
          const normalizedKey = draftKey.startsWith('tmdebt_') ? draftKey : `tmdebt_${draftKey}`;
          const parts = normalizedKey.replace('tmdebt_qualification_form_draft_', '').split('_');
          const groupType = parts.pop() || 'inbound';
          const listId = parts.join('_') || 'default';

          await apiClient.upsertByFields(
            'tmdebt_app_settings',
            {
              setting_key: normalizedKey,
              setting_value: value,
              setting_type: 'json',
              description: `Qualification form draft for listId: ${listId}, groupType: ${groupType}`,
            },
            'setting_key'
          );

          migrated++;
        }
      } catch (error: any) {
        errors.push(`Failed to migrate draft ${draftKey}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Failed to migrate drafts: ${error.message}`);
  }

  return {
    success: errors.length === 0,
    migrated,
    errors,
  };
}

/**
 * Get app setting from API
 */
export async function getAppSetting(key: string, config?: any): Promise<string | null> {
  try {
    const apiClient = config ? new MySQLApiClient(undefined, config) : new MySQLApiClient();
    const setting = await apiClient.findOneByField<AppSetting>(
      'tmdebt_app_settings',
      'setting_key',
      key
    );

    if (setting) {
      // Convert boolean values back
      if (setting.setting_type === 'boolean') {
        return setting.setting_value === '1' ? 'true' : 'false';
      }
      return setting.setting_value;
    }

    return null;
  } catch (error) {
    console.error(`Error getting app setting ${key}:`, error);
    return null;
  }
}

/**
 * Set app setting via API
 */
export async function setAppSetting(
  key: string,
  value: string,
  type: 'string' | 'boolean' | 'number' | 'json' = 'string',
  description?: string,
  config?: any
): Promise<void> {
  let settingValue = value;
  if (type === 'boolean') {
    settingValue = value === 'true' ? '1' : '0';
  }

  const apiClient = config ? new MySQLApiClient(undefined, config) : new MySQLApiClient();
  await apiClient.upsertByFields(
    'tmdebt_app_settings',
    {
      setting_key: key,
      setting_value: settingValue,
      setting_type: type,
      description,
    },
    'setting_key'
  );
}

/**
 * Delete app setting from API
 */
export async function deleteAppSetting(key: string, config?: any): Promise<void> {
  try {
    const apiClient = config ? new MySQLApiClient(undefined, config) : new MySQLApiClient();
    const setting = await apiClient.findOneByField<{ id: number }>(
      'tmdebt_app_settings',
      'setting_key',
      key
    );

    if (setting) {
      await apiClient.deleteById('tmdebt_app_settings', setting.id);
    }
  } catch (error) {
    console.error(`Error deleting app setting ${key}:`, error);
  }
}

