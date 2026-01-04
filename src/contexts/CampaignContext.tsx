import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type Campaign = 'homebound' | 'tmdebt';

interface CampaignContextType {
  campaign: Campaign;
  isHomebound: boolean;
  isTmdebt: boolean;
  refreshCampaign: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

/**
 * Gets campaign from settings override (localStorage) if available
 * This allows settings page to override URL campaign
 */
function getCampaignFromSettings(): Campaign | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const settingsCampaign = localStorage.getItem('settings_campaign');
    if (settingsCampaign === 'homebound' || settingsCampaign === 'tmdebt') {
      return settingsCampaign;
    }
  } catch (error) {
    console.error('Error reading settings campaign:', error);
  }

  return null;
}

/**
 * Gets default campaign from localStorage (user preference)
 * This is the user's default campaign preference, stored per browser
 */
function getDefaultCampaign(): Campaign | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const defaultCampaign = localStorage.getItem('default_campaign');
    if (defaultCampaign === 'homebound' || defaultCampaign === 'tmdebt') {
      return defaultCampaign;
    }
  } catch (error) {
    console.error('Error reading default campaign:', error);
  }

  return null;
}

/**
 * Gets campaign parameter from URL
 * Uses campaign mappings to translate variables to campaign prefixes
 * Valid values: 'homebound' or 'tmdebt' (or mapped variables)
 * Defaults to 'tmdebt' if not specified or invalid
 * Tries to load mappings from localStorage cache first, then falls back to defaults
 */
function getCampaignFromURL(): Campaign {
  if (typeof window === 'undefined') {
    return 'tmdebt';
  }

  const searchParams = new URLSearchParams(window.location.search);
  const campaignParam = searchParams.get('campaign');

  if (!campaignParam) {
    return 'tmdebt';
  }

  const normalizedParam = campaignParam.toLowerCase().trim();

  // Validate campaign parameter directly first (fast path)
  if (normalizedParam === 'homebound' || normalizedParam === 'tmdebt') {
    return normalizedParam;
  }

  // Try to load mappings from localStorage cache (from app_settings)
  try {
    // Check if we have cached mappings in a special localStorage key
    const cachedMappingsKey = 'tmdebt_campaign_mappings_cache';
    const cachedMappings = localStorage.getItem(cachedMappingsKey);
    
    if (cachedMappings) {
      try {
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
      } catch (e) {
        // Invalid cache, ignore
      }
    }
  } catch (error) {
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

  // Default to tmdebt if not specified or invalid
  return 'tmdebt';
}

/**
 * Gets the effective campaign
 * Priority: Settings Override > URL Parameter > Default Campaign > tmdebt
 */
function getEffectiveCampaign(): Campaign {
  // 1. Check settings override first (for settings page)
  const settingsCampaign = getCampaignFromSettings();
  if (settingsCampaign) {
    return settingsCampaign;
  }

  // 2. Check URL parameter (can override default)
  const urlCampaign = getCampaignFromURL();
  // If URL has explicit campaign parameter, use it (even if it's the default)
  const searchParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search)
    : null;
  const hasUrlCampaign = searchParams?.has('campaign');
  
  if (hasUrlCampaign) {
    return urlCampaign;
  }

  // 3. Check user's default campaign preference
  const defaultCampaign = getDefaultCampaign();
  if (defaultCampaign) {
    return defaultCampaign;
  }

  // 4. Fall back to tmdebt
  return 'tmdebt';
}

/**
 * Gets the table prefix for a campaign
 * - 'homebound' -> 'homebound_'
 * - 'tmdebt' -> 'tmdebt_'
 */
export function getCampaignTablePrefix(campaign: Campaign): string {
  return `${campaign}_`;
}

/**
 * Gets the full table name with campaign prefix
 * Examples:
 * - getCampaignTableName('homebound', 'script') -> 'homebound_script'
 * - getCampaignTableName('tmdebt', 'script') -> 'tmdebt_script'
 * - getCampaignTableName('homebound', 'tmdebt_script') -> 'homebound_script' (removes old prefix)
 */
export function getCampaignTableName(campaign: Campaign, baseTableName: string): string {
  // Always remove any existing campaign prefix first
  // This ensures that hardcoded "tmdebt_script" becomes "homebound_script" when campaign=homebound
  const cleanTableName = baseTableName.replace(/^(homebound_|tmdebt_)/, '');
  
  // Apply the current campaign prefix
  return `${getCampaignTablePrefix(campaign)}${cleanTableName}`;
}

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaign, setCampaign] = useState<Campaign>(() => getEffectiveCampaign());

  // Debounced refresh to prevent rapid state updates and cascading re-renders
  const refreshCampaign = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        const newCampaign = getEffectiveCampaign();
        setCampaign(prevCampaign => {
          // Only update if campaign actually changed
          if (prevCampaign !== newCampaign) {
            return newCampaign;
          }
          return prevCampaign;
        });
        timeoutId = null;
      }, 100); // 100ms debounce
    };
  }, []);

  useEffect(() => {
    refreshCampaign();

    // Listen for URL changes (in case of navigation or parameter changes)
    const handleLocationChange = () => {
      refreshCampaign();
    };

    // Listen for settings campaign changes
    const handleSettingsCampaignChange = () => {
      refreshCampaign();
    };

    // Listen for default campaign changes
    const handleDefaultCampaignChange = () => {
      refreshCampaign();
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('settings-campaign-change', handleSettingsCampaignChange);
    window.addEventListener('default-campaign-change', handleDefaultCampaignChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('settings-campaign-change', handleSettingsCampaignChange);
      window.removeEventListener('default-campaign-change', handleDefaultCampaignChange);
    };
  }, []);

  const value = useMemo(() => ({
    campaign,
    isHomebound: campaign === 'homebound',
    isTmdebt: campaign === 'tmdebt',
    refreshCampaign,
  }), [campaign]);

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}

/**
 * Set campaign override for settings page
 * This will override the URL campaign parameter
 */
export function setSettingsCampaign(campaign: Campaign | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (campaign) {
      localStorage.setItem('settings_campaign', campaign);
    } else {
      localStorage.removeItem('settings_campaign');
    }
    
    // Dispatch event to notify CampaignProvider to refresh
    window.dispatchEvent(new Event('settings-campaign-change'));
  } catch (error) {
    console.error('Error setting settings campaign:', error);
  }
}

/**
 * Get campaign override for settings page
 */
export function getSettingsCampaign(): Campaign | null {
  return getCampaignFromSettings();
}

/**
 * Set default campaign for the current user (browser-specific)
 * This will be used when no URL parameter is specified
 */
export function setDefaultCampaign(campaign: Campaign | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (campaign) {
      localStorage.setItem('default_campaign', campaign);
    } else {
      localStorage.removeItem('default_campaign');
    }
    
    // Dispatch event to notify CampaignProvider to refresh
    window.dispatchEvent(new Event('default-campaign-change'));
  } catch (error) {
    console.error('Error setting default campaign:', error);
  }
}

/**
 * Get default campaign for the current user
 */
export function getDefaultCampaignSetting(): Campaign | null {
  return getDefaultCampaign();
}

