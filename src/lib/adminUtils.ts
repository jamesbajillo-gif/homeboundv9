/**
 * Admin Utilities
 * Centralized admin user management and permission checking
 */

import { mysqlApi } from './mysqlApi';
import { getUserId } from './userHistory';
import type { VICILeadData } from './vici-parser';

/**
 * Check if a user ID is an admin user
 * First checks hardcoded admin (000), then checks database
 */
export async function isAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  
  // Hardcoded admin user (backward compatibility)
  if (userId === '000') return true;
  
  // Check database for admin users
  try {
    const adminUsers = await mysqlApi.findByField('app_settings', 'setting_key', 'admin_users');
    if (adminUsers && adminUsers.length > 0) {
      const adminList = JSON.parse(adminUsers[0].setting_value || '[]');
      return Array.isArray(adminList) && adminList.includes(userId);
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Fallback to hardcoded check
    return userId === '000';
  }
  
  return false;
}

/**
 * Synchronous check for admin (uses cached value or hardcoded check)
 * For immediate UI decisions where async is not feasible
 */
export function isAdminUserSync(userId: string | null | undefined): boolean {
  if (!userId) return false;
  // For now, use hardcoded check. In the future, this could use a context/cache
  return userId === '000';
}

/**
 * Get admin users list from database
 */
export async function getAdminUsers(): Promise<string[]> {
  try {
    const adminSetting = await mysqlApi.findOneByField('app_settings', 'setting_key', 'admin_users');
    if (adminSetting) {
      const adminList = JSON.parse(adminSetting.setting_value || '[]');
      return Array.isArray(adminList) ? adminList : [];
    }
  } catch (error) {
    console.error('Error fetching admin users:', error);
  }
  return [];
}

/**
 * Save admin users list to database
 */
export async function saveAdminUsers(userIds: string[]): Promise<void> {
  try {
    // Remove duplicates and filter out empty strings
    const uniqueUserIds = [...new Set(userIds.filter(id => id.trim() !== ''))];
    
    const adminSetting = {
      setting_key: 'admin_users',
      setting_value: JSON.stringify(uniqueUserIds),
      setting_type: 'json' as const,
      description: 'List of admin user IDs with full access to edit and approve scripts across all campaigns',
    };
    
    // Check if setting exists
    const existing = await mysqlApi.findOneByField('app_settings', 'setting_key', 'admin_users');
    
    if (existing) {
      // Update existing
      await mysqlApi.updateById('app_settings', existing.id, adminSetting);
    } else {
      // Create new
      await mysqlApi.create('app_settings', adminSetting);
    }
  } catch (error) {
    console.error('Error saving admin users:', error);
    throw error;
  }
}

/**
 * Check if current user (from VICI lead data) is admin
 */
export async function isCurrentUserAdmin(leadData?: VICILeadData | null): Promise<boolean> {
  const userId = getUserId(leadData);
  return isAdminUser(userId);
}

/**
 * Synchronous check for current user admin status
 */
export function isCurrentUserAdminSync(leadData?: VICILeadData | null): boolean {
  const userId = getUserId(leadData);
  return isAdminUserSync(userId);
}

