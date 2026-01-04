/**
 * Campaign Schema Definition
 * Defines the base table names (without campaign prefix) that are required for all campaigns
 * Both tmdebt and homebound campaigns use the same schema structure
 */

export const BASE_TABLE_NAMES = [
  'users',
  'script',
  'list_id_config',
  'qualification_form_fields',
  'user_groups',
  'zapier_settings',
  'app_settings',
  'script_question_alts',
  'spiel_alts',
  'objection_alts',
  'script_submissions',
  'custom_tabs',
  'listid_custom_tabs',
] as const;

export type BaseTableName = typeof BASE_TABLE_NAMES[number];

/**
 * Get the campaign-prefixed table name
 */
export function getCampaignTableName(campaign: 'tmdebt' | 'homebound', baseTable: BaseTableName): string {
  const prefix = campaign === 'homebound' ? 'homebound_' : 'tmdebt_';
  return `${prefix}${baseTable}`;
}

/**
 * Get all required table names for a campaign
 */
export function getRequiredTablesForCampaign(campaign: 'tmdebt' | 'homebound'): string[] {
  return BASE_TABLE_NAMES.map(baseTable => getCampaignTableName(campaign, baseTable));
}

/**
 * Table descriptions for display in diagnostics
 */
export const TABLE_DESCRIPTIONS: Record<BaseTableName, string> = {
  users: 'User action history and spiel settings',
  script: 'Call script content for different steps',
  list_id_config: 'List ID-specific script overrides',
  qualification_form_fields: 'Dynamic form field definitions for qualification forms',
  user_groups: 'User group assignments (inbound/outbound)',
  zapier_settings: 'Zapier webhook configurations',
  app_settings: 'Application-wide settings (key-value store)',
  script_question_alts: 'Script-specific question text overrides',
  spiel_alts: 'Alternative text for greeting and closing scripts',
  objection_alts: 'Script-specific objection handling responses',
  script_submissions: 'User-submitted scripts awaiting approval',
  custom_tabs: 'Custom tab configurations for inbound/outbound scripts',
  listid_custom_tabs: 'Custom tab configurations for specific List IDs',
};

/**
 * Table categories for grouping in diagnostics
 */
export const TABLE_CATEGORIES: Record<BaseTableName, string> = {
  users: 'User Management',
  script: 'Scripts',
  list_id_config: 'Scripts',
  qualification_form_fields: 'Forms',
  user_groups: 'User Management',
  zapier_settings: 'Integrations',
  app_settings: 'Configuration',
  script_question_alts: 'Scripts',
  spiel_alts: 'Scripts',
  objection_alts: 'Scripts',
  script_submissions: 'Scripts',
  custom_tabs: 'Scripts',
  listid_custom_tabs: 'Scripts',
};

