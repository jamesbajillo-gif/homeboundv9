/**
 * Import script for importing all spiels and configurations from SQL file
 */

import { MySQLApiClient, MySQLConfig } from './mysqlApi';

export interface ImportResult {
  success: boolean;
  imported: {
    scripts: number;
    listIdConfigs: number;
    formFields: number;
    zapierSettings: number;
  };
  errors: string[];
}

/**
 * Parse SQL INSERT statements from SQL file content
 */
function parseSQLInserts(sqlContent: string): {
  tmdebt_script: any[];
  list_id_config: any[];
  qualification_form_fields: any[];
  zapier_settings: any[];
} {
  const result = {
    tmdebt_script: [] as any[],
    list_id_config: [] as any[],
    qualification_form_fields: [] as any[],
    zapier_settings: [] as any[],
  };

  // Match INSERT INTO statements
  const insertRegex = /INSERT INTO\s+`?(\w+)`?\s*\([^)]+\)\s*VALUES\s*([^;]+);/gi;
  let match;

  while ((match = insertRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    const valuesString = match[2];

    // Parse VALUES - handle multi-row inserts
    const rows = parseValues(valuesString);

    if (tableName === 'tmdebt_script' || tableName === 'script' || tableName === 'tmdebt_script') {
      result.tmdebt_script.push(...rows);
    } else if (tableName === 'list_id_config') {
      result.list_id_config.push(...rows);
    } else if (tableName === 'qualification_form_fields') {
      result.qualification_form_fields.push(...rows);
    } else if (tableName === 'zapier_settings') {
      result.zapier_settings.push(...rows);
    }
  }

  return result;
}

/**
 * Parse VALUES string into array of row objects
 * Handles quoted strings, NULL values, and JSON strings
 */
function parseValues(valuesString: string): any[] {
  const rows: any[] = [];
  const lines = valuesString.split('\n').map(line => line.trim()).filter(line => line);

  for (const line of lines) {
    // Match row: (value1, value2, ...)
    const rowMatch = line.match(/^\(([^)]+)\)/);
    if (!rowMatch) continue;

    const valuesStr = rowMatch[1];
    const values = parseRowValues(valuesStr);

    // Map to object based on table structure
    if (values.length >= 3) {
      rows.push({
        values,
        raw: line,
      });
    }
  }

  return rows;
}

/**
 * Parse a single row's values, handling quoted strings and NULL
 */
function parseRowValues(valuesStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const nextChar = valuesStr[i + 1];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
      continue;
    }

    if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      current += char;
      continue;
    }

    if (!inQuotes && char === ',' && nextChar !== ' ') {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

/**
 * Convert parsed SQL values to API payload format
 */
function convertScriptRow(values: string[]): any {
  // tmdebt_script: id, step_name, title, content, button_config, created_at, updated_at
  if (values.length >= 4) {
    return {
      step_name: unquote(values[1]),
      title: unquote(values[2]),
      content: unquote(values[3]),
      button_config: values[4] && values[4] !== 'NULL' ? unquote(values[4]) : null,
    };
  }
  return null;
}

function convertListIdConfigRow(values: string[]): any {
  // list_id_config: id, list_id, name, step_name, title, content, properties, created_at, updated_at
  if (values.length >= 6) {
    return {
      list_id: unquote(values[1]),
      name: unquote(values[2]),
      step_name: values[3] && values[3] !== 'NULL' ? unquote(values[3]) : null,
      title: values[4] && values[4] !== 'NULL' ? unquote(values[4]) : null,
      content: unquote(values[5]),
      properties: values[6] && values[6] !== 'NULL' ? unquote(values[6]) : null,
    };
  }
  return null;
}

function convertFormFieldRow(values: string[]): any {
  // qualification_form_fields: id, field_name, field_label, field_type, field_section, field_options, is_required, zapier_field_name, placeholder, help_text, validation_rules, display_order, is_active, created_at, updated_at
  if (values.length >= 5) {
    return {
      field_name: unquote(values[1]),
      field_label: unquote(values[2]),
      field_type: unquote(values[3]),
      field_section: unquote(values[4]),
      field_options: values[5] && values[5] !== 'NULL' ? unquote(values[5]) : null,
      is_required: values[6] && values[6] !== 'NULL' ? (values[6] === '1' || values[6] === 'true') : 1,
      zapier_field_name: values[7] && values[7] !== 'NULL' ? unquote(values[7]) : null,
      placeholder: values[8] && values[8] !== 'NULL' ? unquote(values[8]) : null,
      help_text: values[9] && values[9] !== 'NULL' ? unquote(values[9]) : null,
      validation_rules: values[10] && values[10] !== 'NULL' ? unquote(values[10]) : null,
      display_order: values[11] && values[11] !== 'NULL' ? parseInt(values[11]) || 0 : 0,
      is_active: values[12] && values[12] !== 'NULL' ? (values[12] === '1' || values[12] === 'true') : 1,
    };
  }
  return null;
}

function convertZapierSettingsRow(values: string[]): any {
  // zapier_settings: id, webhook_url, webhook_name, description, is_active, created_at, updated_at
  if (values.length >= 2) {
    return {
      webhook_url: unquote(values[1]),
      webhook_name: values[2] && values[2] !== 'NULL' ? unquote(values[2]) : null,
      description: values[3] && values[3] !== 'NULL' ? unquote(values[3]) : null,
      is_active: values[4] && values[4] !== 'NULL' ? (values[4] === '1' || values[4] === 'true') : 1,
    };
  }
  return null;
}

/**
 * Remove quotes from a value
 */
function unquote(value: string): string {
  if (!value || value === 'NULL') return '';
  value = value.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  // Unescape quotes
  value = value.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return value;
}

/**
 * Import data from SQL file content
 */
export async function importFromSQL(
  sqlContent: string,
  config: MySQLConfig
): Promise<ImportResult> {
  const errors: string[] = [];
  const imported = {
    scripts: 0,
    listIdConfigs: 0,
    formFields: 0,
    zapierSettings: 0,
  };

  // Create API client with provided config
  const apiClient = new MySQLApiClient(undefined, config);

  try {
    // Parse SQL
    const parsed = parseSQLInserts(sqlContent);

    // Import scripts
    for (const row of parsed.tmdebt_script) {
      try {
        const payload = convertScriptRow(row.values);
        if (payload) {
          await apiClient.upsertByFields(
            'tmdebt_script',
            payload,
            'step_name'
          );
          imported.scripts++;
        }
      } catch (error: any) {
        errors.push(`Failed to import script ${row.values[1]}: ${error.message}`);
      }
    }

    // Import list_id_config
    for (const row of parsed.list_id_config) {
      try {
        const payload = convertListIdConfigRow(row.values);
        if (payload) {
          await apiClient.upsertByFields(
            'tmdebt_list_id_config',
            payload,
            'list_id,step_name'
          );
          imported.listIdConfigs++;
        }
      } catch (error: any) {
        errors.push(`Failed to import list_id_config ${row.values[1]}: ${error.message}`);
      }
    }

    // Import form fields
    for (const row of parsed.qualification_form_fields) {
      try {
        const payload = convertFormFieldRow(row.values);
        if (payload) {
          await apiClient.upsertByFields(
            'tmdebt_qualification_form_fields',
            payload,
            'field_name'
          );
          imported.formFields++;
        }
      } catch (error: any) {
        errors.push(`Failed to import form field ${row.values[1]}: ${error.message}`);
      }
    }

    // Import zapier settings
    for (const row of parsed.zapier_settings) {
      try {
        const payload = convertZapierSettingsRow(row.values);
        if (payload) {
          await apiClient.upsertByFields(
            'tmdebt_zapier_settings',
            payload,
            'webhook_url'
          );
          imported.zapierSettings++;
        }
      } catch (error: any) {
        errors.push(`Failed to import zapier setting ${row.values[1]}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Failed to parse SQL: ${error.message}`);
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

/**
 * Import from SQL file (fetch file content first)
 */
export async function importFromSQLFile(
  filePath: string,
  config: MySQLConfig
): Promise<ImportResult> {
  try {
    // Fetch SQL file content
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch SQL file: ${response.statusText}`);
    }
    const sqlContent = await response.text();
    return await importFromSQL(sqlContent, config);
  } catch (error: any) {
    return {
      success: false,
      imported: {
        scripts: 0,
        listIdConfigs: 0,
        formFields: 0,
        zapierSettings: 0,
      },
      errors: [error.message],
    };
  }
}

