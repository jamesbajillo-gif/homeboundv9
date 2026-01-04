// User History Tracking Service
// Tracks user actions, spiel selections, and user preferences
// Uses localStorage for persistence (no API calls)

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

// UserHistoryRecord interface removed - no longer using database for history

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
    return localStorage.getItem('tmdebt_logged_in_user') || null;
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
    localStorage.setItem('tmdebt_logged_in_user', userId);
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
    localStorage.removeItem('tmdebt_logged_in_user');
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
 * Log user action (no-op - logging removed per user request)
 * Data is now stored in localStorage only
 */
export async function logUserAction(
  leadData: VICILeadData,
  action: UserAction,
  description: string,
  spielsSettings?: SpielSettings,
  metadata?: Record<string, any>
): Promise<void> {
  // No-op: User requested removal of API-based logging
  // If spielsSettings are provided, they will be saved via saveUserSpielSelection
  return Promise.resolve();
}

/**
 * Get storage key for user spiel settings
 */
function getSpielSettingsKey(userId: string): string {
  return `tmdebt_user_spiel_settings_${userId}`;
}

/**
 * Get user's spiel settings from localStorage
 * Returns settings for the requested stepName or all settings
 * Also tries to find settings with matching base stepName (e.g., "greeting" matches "outbound_greeting")
 */
export async function getUserSpielSettings(
  userId: string,
  stepName?: string
): Promise<SpielSettings | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getSpielSettingsKey(userId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    const allSettings: SpielSettings = JSON.parse(stored);
    
    if (stepName) {
      // First try exact match
      if (allSettings[stepName]) {
        return { [stepName]: allSettings[stepName] } as SpielSettings;
      }
      
      // Try to find matching stepName by base name
      // e.g., "greeting" should match "outbound_greeting", "listid_123_greeting", etc.
      const baseStepName = stepName.replace(/^(outbound_|listid_\d+_)/, '');
      const matchingKey = Object.keys(allSettings).find(key => {
        const keyBase = key.replace(/^(outbound_|listid_\d+_)/, '');
        return keyBase === baseStepName;
      });
      
      if (matchingKey && allSettings[matchingKey]) {
        // Return with the requested stepName key (normalize to current context)
        return { [stepName]: allSettings[matchingKey] } as SpielSettings;
      }
      
      return null;
    } else {
      // Return all settings
      return allSettings;
    }
  } catch (error) {
    console.error('Error fetching user spiel settings from localStorage:', error);
    return null;
  }
}

/**
 * Save user's spiel selection to localStorage
 */
export async function saveUserSpielSelection(
  leadData: VICILeadData,
  stepName: string,
  selectedIndex: number,
  totalAlternatives: number
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const userId = getUserId(leadData);
  if (!userId) return;

  try {
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

    // Save to localStorage
    const key = getSpielSettingsKey(userId);
    localStorage.setItem(key, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Error saving user spiel selection to localStorage:', error);
  }
}

/**
 * Set spiel as default for user (saved to localStorage)
 * Also updates matching base stepName keys to ensure cross-context compatibility
 */
export async function setUserSpielDefault(
  leadData: VICILeadData,
  stepName: string,
  defaultIndex: number,
  totalAlternatives: number
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const userId = getUserId(leadData);
  if (!userId) return;

  try {
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

    // Save to localStorage
    const key = getSpielSettingsKey(userId);
    localStorage.setItem(key, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Error saving user spiel default to localStorage:', error);
  }
}

