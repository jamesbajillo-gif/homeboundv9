// User History Tracking Service
// Tracks user actions, spiel selections, and user preferences

import { mysqlApi } from './mysqlApi';
import { VICILeadData } from './vici-parser';

export type UserAction = 'viewed' | 'modified' | 'added' | 'updated' | 'deleted' | 'selected' | 'cycled' | 'submitted';

export interface SpielSettings {
  [stepName: string]: {
    selectedIndex: number;
    defaultIndex?: number; // The index that is set as default for this user
    totalAlternatives: number;
    lastUpdated: string;
  };
}

export interface UserHistoryRecord {
  id?: number;
  user_id: string;
  ip_address?: string;
  action: UserAction;
  description: string;
  spiels_settings?: SpielSettings;
  metadata?: Record<string, any>;
  user_agent?: string;
  created_at?: string;
}

/**
 * Get client IP address from various sources
 */
export function getClientIP(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from VICI lead data first
  const urlParams = new URLSearchParams(window.location.search);
  const viciIP = urlParams.get('ip');
  if (viciIP && viciIP !== '--A--ip--B--') {
    return viciIP;
  }
  
  // Note: Client-side IP detection is limited
  // Real IP should come from server-side or VICI parameter
  return null;
}

/**
 * Get user agent string
 */
export function getUserAgent(): string | null {
  if (typeof window === 'undefined') return null;
  return navigator.userAgent || null;
}

/**
 * Get logged-in user from localStorage (for manual login)
 */
export function getLoggedInUser(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('logged_in_user') || null;
  } catch (error) {
    console.error('Error getting logged-in user:', error);
    return null;
  }
}

/**
 * Set logged-in user in localStorage
 */
export function setLoggedInUser(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('logged_in_user', userId);
  } catch (error) {
    console.error('Error setting logged-in user:', error);
  }
}

/**
 * Clear logged-in user from localStorage
 */
export function clearLoggedInUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('logged_in_user');
  } catch (error) {
    console.error('Error clearing logged-in user:', error);
  }
}

/**
 * Get user ID from VICI lead data or logged-in user
 */
export function getUserId(leadData: VICILeadData): string | null {
  // First check for manually logged-in user
  const loggedInUser = getLoggedInUser();
  if (loggedInUser) {
    return loggedInUser;
  }
  
  // Then check VICI lead data
  const userId = leadData.user || leadData.user_code || leadData.fullname;
  if (userId && !userId.startsWith('--A--') && !userId.includes('--B--')) {
    return userId;
  }
  return null;
}

/**
 * Log user action to database
 */
export async function logUserAction(
  leadData: VICILeadData,
  action: UserAction,
  description: string,
  spielsSettings?: SpielSettings,
  metadata?: Record<string, any>
): Promise<void> {
  const userId = getUserId(leadData);
  if (!userId) {
    console.warn('Cannot log user action: No valid user ID found');
    return;
  }

  // Build record, only including defined values
  const record: any = {
    user_id: userId,
    action,
    description,
  };
  
  // Add optional fields only if they have values
  const ipAddress = getClientIP() || leadData.ip;
  if (ipAddress) {
    record.ip_address = ipAddress;
  }
  
  const userAgent = getUserAgent() || leadData.user_agent;
  if (userAgent) {
    record.user_agent = userAgent;
  }
  
  // JSON fields - send as JSON strings for MySQL JSON columns
  if (spielsSettings) {
    record.spiels_settings = JSON.stringify(spielsSettings);
  }
  
  if (metadata) {
    record.metadata = JSON.stringify(metadata);
  }

  try {
    await mysqlApi.create('homebound_users', record);
  } catch (error) {
    console.error('Error logging user action:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Get user's spiel settings from history
 * Returns the most recent settings that have spiels_settings for the requested stepName
 * Also tries to find settings with matching base stepName (e.g., "greeting" matches "outbound_greeting")
 */
export async function getUserSpielSettings(
  userId: string,
  stepName?: string
): Promise<SpielSettings | null> {
  try {
    // Get multiple records to find the most recent one with spiels_settings
    const records = await mysqlApi.findByField<UserHistoryRecord>(
      'homebound_users',
      'user_id',
      userId,
      {
        orderBy: 'created_at',
        order: 'DESC',
        limit: 50  // Get more records to find one with spiels_settings
      }
    );

    if (stepName) {
      // When looking for a specific stepName, find the most recent record that has settings for it
      const baseStepName = stepName.replace(/^(outbound_|listid_\d+_)/, '');
      
      for (const record of records) {
        if (record.spiels_settings) {
          // Parse JSON if it's a string, otherwise use as-is
          let settings: SpielSettings;
          if (typeof record.spiels_settings === 'string') {
            settings = JSON.parse(record.spiels_settings);
          } else {
            settings = record.spiels_settings as SpielSettings;
          }
          
          // First try exact match
          if (settings[stepName]) {
            return { [stepName]: settings[stepName] } as SpielSettings;
          }
          
          // Try to find matching stepName by base name
          // e.g., "greeting" should match "outbound_greeting", "listid_123_greeting", etc.
          const matchingKey = Object.keys(settings).find(key => {
            const keyBase = key.replace(/^(outbound_|listid_\d+_)/, '');
            return keyBase === baseStepName;
          });
          
          if (matchingKey && settings[matchingKey]) {
            // Return with the requested stepName key (normalize to current context)
            return { [stepName]: settings[matchingKey] } as SpielSettings;
          }
        }
      }
      
      // No matching stepName found in any record
      return null;
    } else {
      // No stepName specified, return the most recent settings
      for (const record of records) {
        if (record.spiels_settings) {
          // Parse JSON if it's a string, otherwise use as-is
          let settings: SpielSettings;
          if (typeof record.spiels_settings === 'string') {
            settings = JSON.parse(record.spiels_settings);
          } else {
            settings = record.spiels_settings as SpielSettings;
          }
          return settings;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching user spiel settings:', error);
  }
  return null;
}

/**
 * Save user's spiel selection
 */
export async function saveUserSpielSelection(
  leadData: VICILeadData,
  stepName: string,
  selectedIndex: number,
  totalAlternatives: number
): Promise<void> {
  const userId = getUserId(leadData);
  if (!userId) return;

  // Get existing settings (all settings, not filtered by stepName)
  const allSettings = await getUserSpielSettings(userId) || {};
  
  // Find existing defaultIndex from any matching stepName variant
  const baseStepName = stepName.replace(/^(outbound_|listid_\d+_)/, '');
  let existingDefault: number | undefined;
  
  // Check current stepName first
  if (allSettings[stepName]?.defaultIndex !== undefined) {
    existingDefault = allSettings[stepName].defaultIndex;
  } else {
    // Check for matching base stepName in other variants
    const matchingKey = Object.keys(allSettings).find(key => {
      const keyBase = key.replace(/^(outbound_|listid_\d+_)/, '');
      return keyBase === baseStepName;
    });
    if (matchingKey && allSettings[matchingKey]?.defaultIndex !== undefined) {
      existingDefault = allSettings[matchingKey].defaultIndex;
    }
  }
  
  // Update settings for this step
  const updatedSettings: SpielSettings = {
    ...allSettings,
    [stepName]: {
      selectedIndex,
      defaultIndex: existingDefault,
      totalAlternatives,
      lastUpdated: new Date().toISOString(),
    },
  };

  await logUserAction(
    leadData,
    'selected',
    `Selected spiel alternative ${selectedIndex + 1} of ${totalAlternatives} for ${stepName}`,
    updatedSettings,
    { stepName, selectedIndex, totalAlternatives }
  );
}

/**
 * Set spiel as default for user
 * Also updates matching base stepName keys to ensure cross-context compatibility
 */
export async function setUserSpielDefault(
  leadData: VICILeadData,
  stepName: string,
  defaultIndex: number,
  totalAlternatives: number
): Promise<void> {
  const userId = getUserId(leadData);
  if (!userId) return;

  // Get existing settings
  const existingSettings = await getUserSpielSettings(userId) || {};
  
  // Find existing selectedIndex from any matching stepName variant
  const baseStepName = stepName.replace(/^(outbound_|listid_\d+_)/, '');
  let existingSelectedIndex: number | undefined;
  
  // Check current stepName first
  if (existingSettings[stepName]?.selectedIndex !== undefined) {
    existingSelectedIndex = existingSettings[stepName].selectedIndex;
  } else {
    // Check for matching base stepName in other variants
    const matchingKey = Object.keys(existingSettings).find(key => {
      const keyBase = key.replace(/^(outbound_|listid_\d+_)/, '');
      return keyBase === baseStepName;
    });
    if (matchingKey && existingSettings[matchingKey]?.selectedIndex !== undefined) {
      existingSelectedIndex = existingSettings[matchingKey].selectedIndex;
    }
  }
  
  // Update settings for this step with defaultIndex
  const updatedSettings: SpielSettings = {
    ...existingSettings,
    [stepName]: {
      selectedIndex: existingSelectedIndex ?? defaultIndex,
      defaultIndex,
      totalAlternatives,
      lastUpdated: new Date().toISOString(),
    },
  };

  await logUserAction(
    leadData,
    'updated',
    `Set spiel alternative ${defaultIndex + 1} as default for ${stepName}`,
    updatedSettings,
    { stepName, defaultIndex, totalAlternatives }
  );
}

