# Settings, MySQL API Usage, and Storage Schema Review

## Executive Summary

This document provides a comprehensive review of:
1. **Settings Management** - How application settings are stored and retrieved
2. **MySQL API Usage** - How the API is used across the application
3. **Storage Schema** - Database table structure and relationships

---

## 1. Settings Management

### 1.1 Storage Locations

#### **localStorage (Client-Side)**
**Purpose**: Browser-specific, temporary storage for sensitive or user-specific data

**Keys Used**:
- `mysql_config` - MySQL database credentials (JSON)
- `settings_access_level` - Access control password (string)
- `debug_mode` - Debug mode toggle (string: 'true'/'false')
- `seen_keyboard_shortcuts` - First-time user flag (string: 'true'/'false')
- `qualification_form_draft_{listId}_{groupType}` - Form draft data (JSON)

**Security Concerns**:
- ⚠️ **No encryption** - All data stored in plain text
- ⚠️ **XSS vulnerability** - Accessible to any script on the same origin
- ⚠️ **Browser-specific** - Data doesn't sync across devices

**Files Using localStorage**:
- `src/lib/mysqlApi.ts` - Loads `mysql_config`
- `src/components/settings/MySQLSettings.tsx` - Saves/loads `mysql_config`
- `src/pages/Settings.tsx` - Loads `debug_mode`, `settings_access_level`
- `src/components/QualificationForm.tsx` - Saves/loads form drafts
- `src/components/FloatingCallHeader.tsx` - Loads `debug_mode`
- `src/pages/Index.tsx` - Saves `settings_access_level`

#### **Database (homebound_app_settings)**
**Purpose**: Persistent, cross-device settings storage

**Table Schema**:
```sql
CREATE TABLE `homebound_app_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text NOT NULL,
  `setting_type` enum('string','boolean','number','json') NOT NULL DEFAULT 'string',
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_type` (`setting_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Settings Stored**:
- `debug_mode` - Boolean
- `seen_keyboard_shortcuts` - Boolean
- `qualification_form_draft_{listId}_{groupType}` - JSON (form drafts)

**Migration Status**:
- ✅ Migration utility exists (`src/lib/migration.ts`)
- ⚠️ **Hybrid approach** - Both localStorage and API used (fallback pattern)
- ⚠️ **Not fully migrated** - Some components still use localStorage directly

### 1.2 Settings Access Patterns

#### **Pattern 1: API-First with localStorage Fallback**
```typescript
// Example from Settings.tsx
const apiDebugMode = await getAppSetting('debug_mode');
const localDebugMode = localStorage.getItem('debug_mode');
const debugValue = apiDebugMode || localDebugMode || 'false';
```

**Used In**:
- `src/pages/Settings.tsx`
- `src/components/FloatingCallHeader.tsx`

**Pros**:
- Graceful degradation if API fails
- Backward compatible

**Cons**:
- Duplicate storage (sync issues possible)
- More complex logic

#### **Pattern 2: localStorage Only**
```typescript
// Example from ListIdConfiguration.tsx
const accessLevel = localStorage.getItem('settings_access_level') || 'kainkatae';
```

**Used In**:
- `src/components/settings/ListIdConfiguration.tsx`
- `src/components/settings/ZapierSettings.tsx`
- `src/components/settings/QualificationFormSettings.tsx`
- `src/pages/Index.tsx`

**Pros**:
- Simple, fast access
- No API dependency

**Cons**:
- Not persistent across devices
- Security risk (XSS vulnerable)

#### **Pattern 3: Dual Write (API + localStorage)**
```typescript
// Example from Settings.tsx
await setAppSetting('debug_mode', checked.toString(), 'boolean', 'Debug mode toggle');
localStorage.setItem('debug_mode', checked.toString());
```

**Used In**:
- `src/pages/Settings.tsx`
- `src/components/QualificationForm.tsx`

**Pros**:
- Immediate local access
- Persistent storage via API

**Cons**:
- Potential sync issues
- More writes (performance)

### 1.3 Settings Migration Status

**Migrated to API**:
- ✅ `debug_mode` - Partial (hybrid approach)
- ✅ `seen_keyboard_shortcuts` - Partial (hybrid approach)
- ✅ `qualification_form_draft_*` - Partial (hybrid approach)

**Still in localStorage Only**:
- ❌ `settings_access_level` - Security-sensitive, intentionally kept local
- ❌ `mysql_config` - Database credentials, intentionally kept local

**Migration Utility**:
- Location: `src/lib/migration.ts`
- Functions: `migrateLocalStorageToAPI()`, `getAppSetting()`, `setAppSetting()`, `deleteAppSetting()`
- Status: ✅ Functional but not fully utilized

---

## 2. MySQL API Usage

### 2.1 API Endpoint

**Base URL**: `https://api.techpinoy.net/mysqlapi.php`

**Documentation**: `mysqlapi_readme.md`

**Features**:
- ✅ Standalone (no config files required)
- ✅ Credentials in every request
- ✅ Supports GET, POST, PUT, DELETE
- ✅ Actions: `select`, `insert`, `update`, `delete`, `upsert`, `list_tables`, `create_table`
- ⚠️ **CORS Issue** - No CORS headers (backend configuration needed)

### 2.2 API Client Architecture

#### **MySQLApiClient** (`src/lib/mysqlApi.ts`)
**Singleton Instance**: `mysqlApi` (exported)

**Configuration Loading Priority**:
1. Constructor parameter (`dbConfig`)
2. localStorage (`mysql_config`)
3. Hardcoded defaults (`DEFAULT_DB_CONFIG`)

**Default Config**:
```typescript
const DEFAULT_DB_CONFIG = {
  sqlhost: '167.86.95.115',
  sqlun: 'dynamicscript',
  sqlpw: 'dynamicscript',
  sqldb: 'dynamicscript',
  sqlport: 3306,
  sqlcharset: 'utf8mb4',
};
```

**Security Concerns**:
- 🔴 **Hardcoded credentials** in source code
- 🔴 **Credentials in URL query parameters** (visible in logs, history)
- 🔴 **No encryption** in localStorage

**Methods**:
- `getAll()` - GET with `action=select`
- `findByField()` - GET with WHERE condition
- `findByFieldIn()` - GET with WHERE IN (client-side filtering)
- `findOneByField()` - GET single record
- `findOneByFields()` - GET with multiple WHERE conditions
- `create()` - POST with `action=insert`
- `updateById()` - PUT with `action=update`
- `updateByField()` - PUT with WHERE condition
- `updateByWhere()` - PUT with WHERE clause
- `deleteById()` - DELETE with `action=delete`
- `deleteByWhere()` - DELETE with WHERE clause
- `upsertByFields()` - POST with `action=upsert`

#### **MySQLTableApiClient** (`src/lib/mysqlTableApi.ts`)
**Static Methods** for table management:
- `testConnection()` - Tests database connectivity
- `listTables()` - Lists all tables
- `checkTablesExist()` - Checks required tables
- `createTable()` - Creates single table
- `createTables()` - Creates multiple tables

### 2.3 React Query Integration

**Status**: ✅ **Partially Implemented**

**Components Using React Query**:
- ✅ `ListIdConfiguration.tsx`
- ✅ `ListIdScriptEditor.tsx`
- ✅ `ListIdScriptEditorSectioned.tsx`
- ✅ `ScriptEditor.tsx` (recently converted)
- ✅ `ScriptDisplay.tsx` (recently converted)
- ✅ `QualificationFormSettings.tsx` (recently converted)
- ✅ `ZapierSettings.tsx` (recently converted)
- ✅ `useQualificationFields.ts` (recently converted)

**Query Keys** (`src/lib/queryKeys.ts`):
```typescript
export const QUERY_KEYS = {
  scripts: {
    all: ['scripts'],
    byStep: (stepName: string) => ['scripts', stepName],
    byListId: (listId: string) => ['scripts', 'list-id', listId],
  },
  formFields: {
    all: ['form-fields'],
    active: ['form-fields', 'active'],
  },
  zapier: {
    all: ['zapier-webhooks'],
    active: ['zapier-webhooks', 'active'],
  },
  listIdConfig: {
    all: ['list-id-configs'],
    byListId: (listId: string) => ['list-id-configs', listId],
  },
  appSettings: {
    all: ['app-settings'],
    byKey: (key: string) => ['app-settings', key],
  },
};
```

**Cache Invalidation**:
- ✅ Script updates invalidate `ScriptDisplay` queries
- ✅ Form field updates invalidate `useQualificationFields` queries
- ✅ Webhook updates invalidate `useZapier` queries
- ✅ List ID updates invalidate related queries

### 2.4 API Usage Statistics

**Total Components Using API**: 15+

**Operations by Type**:
- **Read**: 12 components
- **Create**: 8 components
- **Update**: 10 components
- **Delete**: 3 components
- **Upsert**: 4 components

**Tables Accessed**:
- `homebound_script` - 5 components
- `homebound_list_id_config` - 4 components
- `homebound_qualification_form_fields` - 3 components
- `homebound_zapier_settings` - 2 components
- `homebound_app_settings` - 1 component (migration utility)
- `homebound_user_groups` - 1 component

**Request Frequency** (estimated per session):
- Initial page load: ~10-15 requests
- Settings page: ~5-10 requests
- Script editing: ~2-5 requests per save
- Form submission: ~3-5 requests
- **Total**: ~20-35 requests per typical session

---

## 3. Storage Schema

### 3.1 Database Tables

#### **Required Tables** (all with `homebound_` prefix)

1. **homebound_script**
   - **Purpose**: Call script content for different steps
   - **Key Fields**: `step_name` (unique), `title`, `content`, `button_config`
   - **Used By**: ScriptEditor, ScriptDisplay
   - **Indexes**: `step_name` (unique), `idx_step_name`

2. **homebound_list_id_config**
   - **Purpose**: List ID-specific script overrides
   - **Key Fields**: `list_id`, `step_name`, `name`, `content`
   - **Used By**: ListIdConfiguration, ListIdScriptEditor, ScriptDisplay
   - **Indexes**: `unique_list_step` (list_id, step_name), `idx_list_id`, `idx_step_name`

3. **homebound_qualification_form_fields**
   - **Purpose**: Dynamic form field definitions
   - **Key Fields**: `field_name` (unique), `field_label`, `field_type`, `field_section`, `field_options`
   - **Used By**: QualificationFormSettings, QualificationForm, useQualificationFields
   - **Indexes**: `field_name` (unique), `idx_field_section`, `idx_display_order`, `idx_is_active`

4. **homebound_user_groups**
   - **Purpose**: User group assignments (inbound/outbound)
   - **Key Fields**: `user_identifier` (unique), `group_type`
   - **Used By**: GroupContext
   - **Indexes**: `user_identifier` (unique), `idx_user_identifier`, `idx_group_type`

5. **homebound_zapier_settings**
   - **Purpose**: Zapier webhook configurations
   - **Key Fields**: `webhook_url` (unique), `webhook_name`, `is_active`
   - **Used By**: ZapierSettings, useZapier
   - **Indexes**: `webhook_url` (unique), `idx_is_active`

6. **homebound_app_settings**
   - **Purpose**: Application-wide settings (key-value store)
   - **Key Fields**: `setting_key` (unique), `setting_value`, `setting_type`
   - **Used By**: migration.ts (getAppSetting, setAppSetting)
   - **Indexes**: `setting_key` (unique), `idx_setting_type`

### 3.2 Table Relationships

```
homebound_script
  └─> Default scripts (greeting, qualification, etc.)

homebound_list_id_config
  └─> Overrides for specific list_ids
      └─> References: homebound_script (by step_name)

homebound_qualification_form_fields
  └─> Form field definitions
      └─> Used by: QualificationForm (renders fields)

homebound_user_groups
  └─> User assignments
      └─> Determines: inbound vs outbound scripts

homebound_zapier_settings
  └─> Webhook configurations
      └─> Used by: QualificationForm (on submit)

homebound_app_settings
  └─> Key-value settings store
      └─> Stores: debug_mode, drafts, etc.
```

### 3.3 Schema Consistency Issues

#### **Legacy Table Names**
**Problem**: SQL file (`dynamicscript.sql`) still uses old table names:
- `list_id_config` (should be `homebound_list_id_config`)
- `qualification_form_fields` (should be `homebound_qualification_form_fields`)
- `user_groups` (should be `homebound_user_groups`)
- `zapier_settings` (should be `homebound_zapier_settings`)

**Impact**:
- ⚠️ Import script may create wrong tables
- ⚠️ Backward compatibility maintained in `api/api.php` whitelist

**Recommendation**: Update `dynamicscript.sql` to use `homebound_` prefix

#### **Missing Table**
**Problem**: `homebound_app_settings` not in `dynamicscript.sql`

**Impact**:
- ⚠️ Settings migration may fail if table doesn't exist
- ⚠️ Must be created via MySQL Settings page

**Recommendation**: Add to `dynamicscript.sql`

### 3.4 Index Strategy

**Current Indexes**:
- ✅ Primary keys on all tables
- ✅ Unique constraints on key fields
- ✅ Indexes on frequently queried fields (`step_name`, `list_id`, `field_section`, etc.)

**Missing Indexes** (potential optimizations):
- ⚠️ `homebound_app_settings.setting_type` - Has index but may need composite index
- ⚠️ `homebound_list_id_config.list_id` - Has index, but composite with `step_name` might help

---

## 4. Issues and Recommendations

### 4.1 Critical Issues

#### **1. Security: Hardcoded Credentials**
**Location**: `src/lib/mysqlApi.ts`, `src/lib/mysqlTableApi.ts`

**Issue**: Database credentials hardcoded in source code

**Recommendation**:
- Move to environment variables
- Use `.env` file (not committed to git)
- Implement at build time or runtime

#### **2. Security: Credentials in URL**
**Location**: All API requests

**Issue**: Credentials visible in URL query parameters

**Recommendation**:
- Move to POST body for sensitive operations
- Use encrypted headers
- Implement server-side proxy (long-term)

#### **3. Security: No Encryption in localStorage**
**Location**: `mysql_config` storage

**Issue**: Credentials stored in plain text

**Recommendation**:
- Implement client-side encryption (crypto-js or Web Crypto API)
- Or: Remove from localStorage entirely, require user input each time

#### **4. CORS Error**
**Location**: API endpoint

**Issue**: `https://api.techpinoy.net/mysqlapi.php` doesn't send CORS headers

**Recommendation**:
- Backend must add CORS headers:
  ```php
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
  ```

### 4.2 Medium Priority Issues

#### **1. Inconsistent Settings Storage**
**Issue**: Hybrid approach (API + localStorage) creates sync issues

**Recommendation**:
- Choose one primary storage (prefer API)
- Use localStorage only as temporary cache
- Implement sync mechanism

#### **2. Duplicate Default Configs**
**Issue**: `DEFAULT_DB_CONFIG` and `DEFAULT_MYSQL_CONFIG` are duplicates

**Recommendation**:
- Consolidate to single source of truth
- `mysqlApi.ts` should export, `mysqlTableApi.ts` should import

#### **3. Missing Error Handling**
**Issue**: Some components don't handle API errors gracefully

**Recommendation**:
- Implement error boundary
- Centralized error handling
- User-friendly error messages

#### **4. No Request Retry Logic**
**Issue**: Network failures cause immediate errors

**Recommendation**:
- Implement exponential backoff retry
- React Query has built-in retry (configure properly)

### 4.3 Low Priority Improvements

#### **1. Request Caching**
**Issue**: Some redundant API calls

**Recommendation**:
- Full React Query migration (in progress)
- Configure appropriate `staleTime` and `cacheTime`

#### **2. Request Cancellation**
**Issue**: Requests continue after component unmounts

**Recommendation**:
- Use AbortController
- React Query handles this automatically (use properly)

#### **3. Type Safety**
**Issue**: Table names are strings (typos possible)

**Recommendation**:
- Create enum or const object:
  ```typescript
  export const TABLES = {
    SCRIPT: 'homebound_script',
    LIST_ID_CONFIG: 'homebound_list_id_config',
    // ...
  } as const;
  ```

---

## 5. Summary

### Current State: ⚠️ **Functional but Needs Security Improvements**

**Strengths**:
- ✅ Unified API endpoint
- ✅ React Query integration (mostly complete)
- ✅ Cache invalidation working
- ✅ Consistent table naming (`homebound_` prefix)
- ✅ Migration utility exists

**Weaknesses**:
- 🔴 Security vulnerabilities (hardcoded credentials, URL exposure)
- 🔴 CORS issue (backend configuration)
- ⚠️ Inconsistent settings storage
- ⚠️ Duplicate configurations
- ⚠️ Legacy table names in SQL file

### Priority Actions

**Immediate**:
1. Fix CORS issue (backend)
2. Move credentials to environment variables
3. Consolidate default configs

**Short-term**:
1. Complete settings migration to API
2. Add error handling
3. Implement request retry logic

**Long-term**:
1. Server-side proxy for database operations
2. Encrypt credentials in localStorage
3. Type-safe table names

---

## 6. Files Reference

### Settings Management
- `src/lib/migration.ts` - Migration utilities
- `src/pages/Settings.tsx` - Settings page
- `src/components/FloatingCallHeader.tsx` - Debug mode toggle
- `src/components/QualificationForm.tsx` - Form drafts

### MySQL API
- `src/lib/mysqlApi.ts` - Main API client
- `src/lib/mysqlTableApi.ts` - Table management client
- `src/lib/queryKeys.ts` - React Query keys
- `src/components/settings/MySQLSettings.tsx` - MySQL configuration UI

### Storage Schema
- `src/lib/mysqlTableApi.ts` - Table definitions
- `dynamicscript.sql` - Database dump (needs update)
- `mysqlapi_readme.md` - API documentation

