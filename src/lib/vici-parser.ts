// VICI URL Parameter Parser
// Parses VICI dialer parameters from URL query string

import { toZonedTime, format } from 'date-fns-tz';

export interface VICILeadData {
  // Core Lead Info
  lead_id?: string;
  first_name?: string;
  last_name?: string;
  fullname?: string;
  phone_number?: string;
  alt_phone?: string;
  email?: string;
  date_of_birth?: string;
  age?: string;
  
  // Address Info
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  province?: string;
  postal_code?: string;
  
  // Call Info
  call_id?: string;
  user?: string;
  user_group?: string;
  user_code?: string;
  channel_group?: string;
  list_id?: string;
  entry_list_id?: string;
  entry_date?: string;
  
  // Tracking Info
  vendor_lead_code?: string;
  source_id?: string;
  citizens_lead_id?: string;
  jornaya_id?: string;
  trusted_form_id?: string;
  
  // DID Info
  did_pattern?: string;
  did_description?: string;
  
  // Custom Fields
  security_phrase?: string;
  ip?: string;
  srcsubid?: string;
  test?: string;
  ts?: string;
  url?: string;
  wls?: string;
  lpid?: string;
  user_agent?: string;
  
  // Any other custom fields
  [key: string]: string | undefined;
}

/**
 * Parses URL parameters and extracts VICI lead data
 * @param searchParams - URLSearchParams or search string
 * @returns Parsed lead data object
 */
export function parseVICIParams(searchParams: URLSearchParams | string): VICILeadData {
  const params = typeof searchParams === 'string' 
    ? new URLSearchParams(searchParams) 
    : searchParams;
  
  const leadData: VICILeadData = {};
  
  // Iterate through all parameters
  for (const [key, value] of params.entries()) {
    // Skip empty values or VICI placeholder values
    if (!value || value === '--A----B--' || value.startsWith('--A--')) {
      continue;
    }
    
    // Store the value
    leadData[key] = value;
  }
  
  return leadData;
}

/**
 * Gets lead data from current window URL
 */
export function getVICILeadData(): VICILeadData {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const searchParams = new URLSearchParams(window.location.search);
  return parseVICIParams(searchParams);
}

/**
 * Formats lead data for display
 */
export function formatLeadDisplay(leadData: VICILeadData): string {
  const parts: string[] = [];
  
  // Customer name from first_name + last_name (NOT fullname which is agent)
  if (leadData.first_name || leadData.last_name) {
    parts.push(`${leadData.first_name || ''} ${leadData.last_name || ''}`.trim());
  }
  
  if (leadData.phone_number) {
    parts.push(leadData.phone_number);
  }
  
  if (leadData.city && leadData.state) {
    parts.push(`${leadData.city}, ${leadData.state}`);
  }
  
  return parts.join(' • ');
}

/**
 * Checks if current page is loaded in VICI iframe
 */
export function isInVICIFrame(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // If we can't access window.top, we're likely in an iframe
  }
}

/**
 * Mapping of script placeholders to VICI field names
 * VICI Data Structure:
 * - first_name = Customer First Name
 * - last_name = Customer Last Name  
 * - fullname = Agent Name
 */
const PLACEHOLDER_MAPPINGS: Record<string, string[]> = {
  'Name': ['first_name', 'firstname'],
  'First Name': ['first_name', 'firstname'],
  'Last Name': ['last_name', 'lastname'],
  'Customer Name': ['first_name', 'firstname'],
  'Your Name': ['fullname', 'agent_name'],
  'Agent Name': ['fullname', 'agent_name'],
  'Company': ['company', 'company_name'],
  'Company Name': ['company', 'company_name'],
  'State': ['address3'],
  'City': ['city'],
  'Phone': ['phone_number', 'phone'],
  'Email': ['email', 'email_address'],
  'Address': ['address1', 'address'],
  'Zip': ['postal_code', 'zip', 'zipcode'],
  'Zip Code': ['postal_code', 'zip', 'zipcode'],
  'Date': ['entry_date', 'date'],
  'Time': ['entry_date', 'time'],
};

/**
 * Gets the current time of day based on PST timezone
 */
function getTimeOfDay(): string {
  const pstTime = toZonedTime(new Date(), 'America/Los_Angeles');
  const hour = pstTime.getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'evening';
  } else {
    return 'evening'; // Late night defaults to evening
  }
}

/**
 * Replaces bracketed placeholders in script content with actual VICI data
 * Examples: [First Name], [State], [Company Name], [morning/afternoon/evening]
 * 
 * @param scriptContent - The script text containing bracketed placeholders
 * @param leadData - VICI lead data object
 * @returns Script content with placeholders replaced by actual values
 */
export function replaceScriptVariables(scriptContent: string, leadData: VICILeadData): string {
  let processedContent = scriptContent;
  
  // First, handle the special time of day replacement
  processedContent = processedContent.replace(/\[morning\/afternoon\/evening\]/gi, getTimeOfDay());
  
  // Find all other bracketed placeholders
  const placeholderRegex = /\[([^\]]+)\]/g;
  const matches = processedContent.matchAll(placeholderRegex);
  
  for (const match of matches) {
    const fullMatch = match[0]; // e.g., "[First Name]"
    const placeholderText = match[1]; // e.g., "First Name"
    
    // Try to find a value for this placeholder
    let replacementValue = '';
    
    // First, try direct mapping from our predefined mappings
    if (PLACEHOLDER_MAPPINGS[placeholderText]) {
      for (const fieldName of PLACEHOLDER_MAPPINGS[placeholderText]) {
        if (leadData[fieldName]) {
          replacementValue = leadData[fieldName] || '';
          break;
        }
      }
    }
    
    // If no mapping found, try case-insensitive direct match with VICI fields
    if (!replacementValue) {
      const normalizedPlaceholder = placeholderText.toLowerCase().replace(/\s+/g, '_');
      
      // Try exact match
      if (leadData[normalizedPlaceholder]) {
        replacementValue = leadData[normalizedPlaceholder] || '';
      } else {
        // Try partial match - find any field containing the placeholder text
        for (const [key, value] of Object.entries(leadData)) {
          if (key.toLowerCase().includes(normalizedPlaceholder) || 
              normalizedPlaceholder.includes(key.toLowerCase())) {
            replacementValue = value || '';
            break;
          }
        }
      }
    }
    
    // Special case: Customer Name uses just first name
    if (placeholderText === 'Customer Name' && !replacementValue) {
      replacementValue = leadData.first_name || leadData.firstname || '';
    }
    
    // Replace the placeholder with the value (or keep the placeholder if no value found)
    if (replacementValue) {
      processedContent = processedContent.replace(fullMatch, replacementValue);
    }
  }
  
  return processedContent;
}
