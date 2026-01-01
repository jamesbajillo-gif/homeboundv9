/**
 * React Query Key Constants
 * Centralized query keys for cache management and invalidation
 */

export const QUERY_KEYS = {
  // Scripts
  scripts: {
    all: ['scripts'] as const,
    byStep: (stepName: string) => ['scripts', stepName] as const,
    byListId: (listId: string) => ['scripts', 'list-id', listId] as const,
    byListIdAndStep: (listId: string, stepName: string) => 
      ['scripts', 'list-id', listId, stepName] as const,
  },
  
  // Form Fields
  formFields: {
    all: ['form-fields'] as const,
    active: ['form-fields', 'active'] as const,
    bySection: (section: string) => ['form-fields', 'section', section] as const,
  },
  
  // Zapier Webhooks
  zapier: {
    all: ['zapier-webhooks'] as const,
    active: ['zapier-webhooks', 'active'] as const,
  },
  
  // List ID Configuration
  listIdConfig: {
    all: ['list-id-configs'] as const,
    byListId: (listId: string) => ['list-id-configs', listId] as const,
    byListIdAndStep: (listId: string, stepName: string) => 
      ['list-id-configs', listId, stepName] as const,
  },
  
  // App Settings
  appSettings: {
    all: ['app-settings'] as const,
    byKey: (key: string) => ['app-settings', key] as const,
  },
} as const;

