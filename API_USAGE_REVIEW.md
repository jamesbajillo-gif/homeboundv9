# API Usage Review

## Overview

The application uses a unified MySQL API endpoint (`https://api.techpinoy.net/mysqlapi.php`) for all database operations. This review covers API usage patterns, methods, security, and recommendations.

## API Endpoint

**Base URL**: `https://api.techpinoy.net/mysqlapi.php`

**Documentation**: See `mysqlapi_readme.md` for full API specification

## API Client Architecture

### 1. MySQLApiClient (`src/lib/mysqlApi.ts`)

**Singleton Instance**: `mysqlApi` (exported at line 429)
- Used throughout the application for CRUD operations
- Automatically loads config from localStorage
- Sends credentials in URL query parameters for every request

**Key Methods**:
- `getAll()` - GET with `action=select`
- `findByField()` - GET with `action=select` + WHERE
- `findByFieldIn()` - GET with `action=select` + WHERE IN
- `findOneByField()` - GET with `action=select` + WHERE (returns first)
- `findOneByFields()` - GET with `action=select` + multiple WHERE conditions
- `create()` - POST with `action=insert`
- `updateById()` - PUT with `action=update`
- `updateByField()` - PUT with `action=update` + WHERE
- `updateByWhere()` - PUT with `action=update` + WHERE
- `deleteById()` - DELETE with `action=delete`
- `deleteByWhere()` - DELETE with `action=delete` + WHERE
- `upsertByFields()` - POST with `action=upsert`

### 2. MySQLTableApiClient (`src/lib/mysqlTableApi.ts`)

**Static Methods**: Used for table management operations
- `testConnection()` - Tests database connectivity
- `listTables()` - Lists all tables in database
- `checkTablesExist()` - Checks if required tables exist
- `createTable()` - Creates a single table
- `createTables()` - Creates multiple tables

## API Usage Patterns

### Pattern 1: CRUD Operations (Most Common)

**Location**: Used in 15+ components
- `ScriptEditor.tsx` - Script management
- `QualificationFormSettings.tsx` - Form field management
- `ZapierSettings.tsx` - Webhook management
- `ListIdConfiguration.tsx` - List ID management
- `ListIdScriptEditor.tsx` - List ID script editing
- `ListIdScriptEditorSectioned.tsx` - Sectioned script editing

**Example**:
```typescript
// Read
const data = await mysqlApi.getAll<FormField>("tmdebt_qualification_form_fields");

// Create
await mysqlApi.create("tmdebt_script", insertPayload);

// Update
await mysqlApi.updateById("zapier_settings", id, updateData);

// Delete
await mysqlApi.deleteById("zapier_settings", id);
```

### Pattern 2: Query with Filters

**Location**: `ScriptDisplay.tsx`, `QualificationForm.tsx`, `useQualificationFields.ts`

**Example**:
```typescript
// Find by single field
const data = await mysqlApi.findOneByField<ScriptSection>(
  "tmdebt_script",
  "step_name",
  stepName
);

// Find by multiple fields
const data = await mysqlApi.findOneByFields<ScriptData>(
  "list_id_config",
  { list_id: listId, step_name: stepName }
);

// Find with WHERE IN
const defaultData = await mysqlApi.findByFieldIn<{...}>(
  "tmdebt_script",
  "step_name",
  ["greeting", "qualification", "closing"]
);
```

### Pattern 3: Upsert Operations

**Location**: `ScriptEditor.tsx`, `ListIdScriptEditor.tsx`, `ListIdScriptEditorSectioned.tsx`

**Example**:
```typescript
await mysqlApi.upsertByFields(
  "tmdebt_script",
  payload,
  "step_name" // unique field(s)
);
```

### Pattern 4: Table Management

**Location**: `MySQLSettings.tsx`

**Example**:
```typescript
// Test connection
const result = await MySQLTableApiClient.testConnection(config);

// Check tables
const result = await MySQLTableApiClient.checkTablesExist(config, REQUIRED_TABLES);

// Create tables
const result = await MySQLTableApiClient.createTables(config, sqlStatements);
```

## Request Format Analysis

### Current Implementation

**All Requests Include Credentials in URL**:
```
GET https://api.techpinoy.net/mysqlapi.php?
  action=select&
  table=tmdebt_script&
  sqlhost=167.86.95.115&
  sqlun=dynamicscript&
  sqlpw=dynamicscript&
  sqldb=dynamicscript&
  sqlport=3306&
  sqlcharset=utf8mb4&
  where={"step_name":"greeting"}
```

**HTTP Methods Used**:
- `GET` - Select operations (`action=select`, `action=list_tables`)
- `POST` - Insert/Upsert operations (`action=insert`, `action=upsert`, `action=create_table`)
- `PUT` - Update operations (`action=update`)
- `DELETE` - Delete operations (`action=delete`)

### Request Body Format

**POST (Insert)**:
```json
{
  "data": {
    "step_name": "greeting",
    "title": "Opening",
    "content": "..."
  }
}
```

**PUT (Update)**:
```json
{
  "data": {
    "title": "Updated Title"
  },
  "where": {
    "id": 1
  }
}
```

**DELETE**:
```json
{
  "where": {
    "id": 1
  }
}
```

**POST (Upsert)**:
```json
{
  "data": {
    "step_name": "greeting",
    "title": "Opening",
    "content": "..."
  }
}
```

## Security Concerns

### 🔴 Critical Issues

1. **Credentials in URL Query Parameters**
   - **Impact**: Credentials visible in:
     - Browser address bar (if URL is long)
     - Browser history
     - Server access logs
     - Network monitoring tools
     - Referrer headers
   - **Frequency**: Every single API request (100+ per session)
   - **Recommendation**: Move to POST body or headers

2. **No Request Rate Limiting**
   - **Impact**: Potential for abuse, DDoS
   - **Current**: No client-side throttling
   - **Recommendation**: Implement request queuing/throttling

3. **No Request Retry Logic**
   - **Impact**: Network failures cause immediate errors
   - **Current**: Single attempt, no retry
   - **Recommendation**: Implement exponential backoff retry

4. **No Request Caching**
   - **Impact**: Redundant API calls for same data
   - **Current**: Every component fetches independently
   - **Recommendation**: Implement React Query caching (partially done)

### 🟡 Medium Issues

1. **Inconsistent Error Handling**
   - Some components handle errors, others don't
   - No centralized error handling
   - **Recommendation**: Create error boundary and centralized handler

2. **No Request Deduplication**
   - Multiple components may request same data simultaneously
   - **Recommendation**: Use React Query's request deduplication

3. **No Request Cancellation**
   - Requests continue even if component unmounts
   - **Recommendation**: Use AbortController for cancellation

4. **Hardcoded API Endpoint**
   - Cannot change endpoint without code changes
   - **Recommendation**: Use environment variable

## API Usage Statistics

### Components Using API

**Total**: 15+ components

**By Operation Type**:
- **Read Operations**: 12 components
- **Create Operations**: 8 components
- **Update Operations**: 10 components
- **Delete Operations**: 3 components
- **Upsert Operations**: 4 components

**By Table**:
- `tmdebt_script`: 5 components
- `tmdebt_list_id_config`: 4 components
- `tmdebt_qualification_form_fields`: 3 components
- `tmdebt_zapier_settings`: 2 components
- `tmdebt_app_settings`: 1 component (migration utility)

### Request Frequency

**Estimated per User Session**:
- Initial page load: ~10-15 requests
- Settings page: ~5-10 requests
- Script editing: ~2-5 requests per save
- Form submission: ~3-5 requests

**Total**: ~20-35 requests per typical session

## React Query Integration

### Current State

**Partially Implemented**:
- `ListIdScriptEditorSectioned.tsx` uses `useQuery`
- `ListIdScriptEditor.tsx` uses `useQuery` and `useMutation`
- Most other components use direct API calls

**Benefits of Full Integration**:
- Automatic caching
- Request deduplication
- Background refetching
- Optimistic updates
- Error retry

**Recommendation**: Migrate all API calls to React Query

## Recommendations

### Immediate Actions

1. **Move Credentials to Request Body**
   ```typescript
   // Instead of URL params
   const body = {
     sqlhost: config.sqlhost,
     sqlun: config.sqlun,
     sqlpw: config.sqlpw,
     sqldb: config.sqldb,
     // ... operation data
   };
   ```

2. **Add Request Retry Logic**
   ```typescript
   async function fetchWithRetry(url, options, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fetch(url, options);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

3. **Implement Request Cancellation**
   ```typescript
   const controller = new AbortController();
   fetch(url, { signal: controller.signal });
   // Cancel on unmount
   return () => controller.abort();
   ```

4. **Add Environment Variable for API URL**
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.techpinoy.net/mysqlapi.php';
   ```

### Medium-Term Improvements

1. **Full React Query Migration**
   - Convert all API calls to use `useQuery`/`useMutation`
   - Implement proper cache invalidation
   - Add optimistic updates for better UX

2. **Centralized Error Handling**
   - Create API error interceptor
   - Implement error boundary
   - Add user-friendly error messages

3. **Request Rate Limiting**
   - Implement client-side throttling
   - Queue requests if rate limit exceeded
   - Show user feedback for rate limits

4. **Request Logging/Monitoring**
   - Log all API requests (dev mode)
   - Track request success/failure rates
   - Monitor response times

### Long-Term Improvements

1. **API Proxy Layer**
   - Create backend proxy for database operations
   - Store credentials server-side only
   - Frontend only sends operation requests

2. **Request Batching**
   - Batch multiple operations into single request
   - Reduce network overhead
   - Improve performance

3. **Offline Support**
   - Cache responses for offline access
   - Queue mutations when offline
   - Sync when connection restored

## Code Quality Issues

### 1. Inconsistent Error Handling

**Problem**: Some components handle errors, others don't
```typescript
// Good
try {
  await mysqlApi.create(...);
} catch (error) {
  toast.error(error.message);
}

// Bad
await mysqlApi.create(...); // No error handling
```

### 2. No Type Safety for Table Names

**Problem**: Table names are strings, no type checking
```typescript
// Could be typo
await mysqlApi.getAll("tmdebt_scrip"); // Missing 't'
```

**Recommendation**: Create enum or const object
```typescript
const TABLES = {
  SCRIPT: 'tmdebt_script',
  LIST_ID_CONFIG: 'tmdebt_list_id_config',
  // ...
} as const;
```

### 3. Duplicate API Client Instances

**Problem**: Some code creates new instances instead of using singleton
```typescript
// In migration.ts and importScript.ts
const apiClient = new MySQLApiClient(undefined, config);
```

**Recommendation**: Use singleton or dependency injection

## Summary

**Current State**: ⚠️ **Functional but insecure**
- API works correctly
- Credentials exposed in every request
- No retry/cancellation/caching
- Inconsistent error handling

**Priority**: 🔴 **High** - Security and reliability improvements needed

**Recommended Next Steps**:
1. Move credentials to request body
2. Add request retry logic
3. Implement React Query fully
4. Add centralized error handling
5. Create API proxy layer (long-term)

