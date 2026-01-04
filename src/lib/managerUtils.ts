/**
 * Manager Utilities
 * Centralized manager user management and permission checking
 */

import { mysqlApi } from './mysqlApi';
import { getUserId } from './userHistory';
import type { VICILeadData } from './vici-parser';
import { isAdminUserSync } from './adminUtils';

/**
 * Check if a user ID is a manager user
 * Managers have permissions to edit scripts, approve submissions, and add new content
 */
export async function isManagerUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  
  // Admins are also managers (admins have all manager permissions + more)
  if (isAdminUserSync(userId)) return true;
  
  // Hardcoded manager user (backward compatibility)
  if (userId === '021') return true;
  
  // Check database for manager users
  try {
    const managerUsers = await mysqlApi.findByField('app_settings', 'setting_key', 'manager_users');
    if (managerUsers && managerUsers.length > 0) {
      const managerList = JSON.parse(managerUsers[0].setting_value || '[]');
      return Array.isArray(managerList) && managerList.includes(userId);
    }
  } catch (error) {
    console.error('Error checking manager status:', error);
    // Fallback to hardcoded check
    return userId === '021';
  }
  
  return false;
}

/**
 * Synchronous check for manager (uses cached value or admin check)
 * For immediate UI decisions where async is not feasible
 */
export function isManagerUserSync(userId: string | null | undefined): boolean {
  if (!userId) return false;
  // Admins are also managers
  if (isAdminUserSync(userId)) return true;
  // Hardcoded manager user (backward compatibility)
  if (userId === '021') return true;
  // For now, use hardcoded check. In the future, this could use a context/cache
  // Managers would be stored in localStorage cache or context
  return false;
}

/**
 * Get manager users list from database
 */
export async function getManagerUsers(): Promise<string[]> {
  try {
    const managerSetting = await mysqlApi.findOneByField('app_settings', 'setting_key', 'manager_users');
    if (managerSetting) {
      const managerList = JSON.parse(managerSetting.setting_value || '[]');
      return Array.isArray(managerList) ? managerList : [];
    }
  } catch (error) {
    console.error('Error fetching manager users:', error);
  }
  return [];
}

/**
 * Save manager users list to database
 */
export async function saveManagerUsers(userIds: string[]): Promise<void> {
  try {
    // Remove duplicates and filter out empty strings
    const uniqueUserIds = [...new Set(userIds.filter(id => id.trim() !== ''))];
    
    const managerSetting = {
      setting_key: 'manager_users',
      setting_value: JSON.stringify(uniqueUserIds),
      setting_type: 'json' as const,
      description: 'List of manager user IDs with permissions to edit scripts, approve submissions, and add new content across all campaigns',
    };
    
    // Check if setting exists
    const existing = await mysqlApi.findOneByField('app_settings', 'setting_key', 'manager_users');
    
    if (existing) {
      // Update existing
      await mysqlApi.updateById('app_settings', existing.id, managerSetting);
    } else {
      // Create new
      await mysqlApi.create('app_settings', managerSetting);
    }
  } catch (error) {
    console.error('Error saving manager users:', error);
    throw error;
  }
}

/**
 * Check if current user (from VICI lead data) is manager
 */
export async function isCurrentUserManager(leadData?: VICILeadData | null): Promise<boolean> {
  const userId = getUserId(leadData);
  return isManagerUser(userId);
}

/**
 * Synchronous check for current user manager status
 */
export function isCurrentUserManagerSync(leadData?: VICILeadData | null): boolean {
  const userId = getUserId(leadData);
  return isManagerUserSync(userId);
}

/**
 * Check if user can edit scripts/spiels
 * Returns true if user is admin or manager
 */
export function canEditScripts(userId: string | null | undefined): boolean {
  return isManagerUserSync(userId);
}

/**
 * Check if user can approve submissions
 * Returns true if user is admin or manager
 */
export function canApproveSubmissions(userId: string | null | undefined): boolean {
  return isManagerUserSync(userId);
}

/**
 * Check if user can add new scripts/tabs
 * Returns true if user is admin or manager
 */
export function canAddScripts(userId: string | null | undefined): boolean {
  return isManagerUserSync(userId);
}

