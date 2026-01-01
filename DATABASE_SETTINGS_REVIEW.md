# Database Settings Review

## Current State

### 1. **Hardcoded Credentials**

#### Locations Found:
- `src/lib/mysqlApi.ts` (lines 4-11): `DEFAULT_DB_CONFIG`
  ```typescript
  sqlhost: '167.86.95.115'
  sqlun: 'dynamicscript'
  sqlpw: 'dynamicscript'
  sqldb: 'dynamicscript'
  ```

- `src/lib/mysqlTableApi.ts` (lines 291-298): `DEFAULT_MYSQL_CONFIG`
  ```typescript
  sqlhost: '167.86.95.115'
  sqlun: 'dynamicscript'
  sqlpw: 'dynamicscript'
  sqldb: 'dynamicscript'
  ```

- `api/config.php` (lines 8-17): Different host/IP
  ```php
  DB_HOST: '109.199.100.69'
  DB_USER: 'dynamicscript'
  DB_PASS: 'dynamicscript'
  ```

- `src/lib/supabase.ts` (lines 3-4): Supabase credentials
  ```typescript
  supabaseUrl: 'https://db1.techpinoy.net'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  ```

### 2. **Storage Mechanism**

#### localStorage (`mysql_config`)
- **Location**: `src/lib/mysqlApi.ts` (line 45), `src/components/settings/MySQLSettings.tsx` (line 43)
- **Key**: `'mysql_config'`
- **Format**: JSON stringified `MySQLConfig` object
- **Security**: ⚠️ **No encryption** - credentials stored in plain text
- **Scope**: Browser-specific, persists across sessions

#### Configuration Loading Priority:
1. Constructor parameter (`dbConfig`)
2. localStorage (`mysql_config`)
3. Hardcoded defaults (`DEFAULT_DB_CONFIG`)

### 3. **Credential Transmission**

#### API Request Format:
- **Method**: Query parameters in URL
- **Example**: `https://api.techpinoy.net/mysqlapi.php?sqlhost=...&sqlun=...&sqlpw=...&sqldb=...`
- **Security Concern**: ⚠️ **Credentials visible in URL** (can be logged, cached, or exposed in browser history)

#### Implementation:
- `src/lib/mysqlApi.ts` (lines 58-75): `buildParams()` method
- Every API request includes credentials in query string

### 4. **Configuration Management**

#### MySQL Settings UI:
- **Component**: `src/components/settings/MySQLSettings.tsx`
- **Features**:
  - Load config from localStorage on mount
  - Save config to localStorage on save
  - Test connection
  - Check tables
  - Create missing tables
- **Reset**: Button to reset to defaults (line 149)

#### Import Data Component:
- **Component**: `src/components/settings/ImportData.tsx`
- **Behavior**: Loads config from localStorage, uses `DEFAULT_MYSQL_CONFIG` as fallback

## Security Concerns

### 🔴 Critical Issues:

1. **Hardcoded Credentials in Source Code**
   - Credentials are visible in Git repository
   - Anyone with code access can see credentials
   - **Recommendation**: Move to environment variables

2. **Credentials in URL Query Parameters**
   - Visible in browser address bar (if URL is long)
   - Logged in server access logs
   - Cached in browser history
   - **Recommendation**: Use POST body or headers for sensitive data

3. **No Encryption in localStorage**
   - Credentials stored in plain text
   - Accessible via browser DevTools
   - **Recommendation**: Consider encryption or use secure storage

4. **Client-Side Credential Management**
   - All credentials accessible in browser JavaScript
   - Can be extracted via DevTools
   - **Recommendation**: Use server-side proxy for database operations

### 🟡 Medium Issues:

1. **Duplicate Default Configurations**
   - `DEFAULT_DB_CONFIG` in `mysqlApi.ts`
   - `DEFAULT_MYSQL_CONFIG` in `mysqlTableApi.ts`
   - **Recommendation**: Consolidate to single source

2. **Inconsistent Host IPs**
   - `mysqlApi.ts`: `167.86.95.115`
   - `config.php`: `109.199.100.69`
   - **Recommendation**: Verify correct host and standardize

3. **No Environment-Based Configuration**
   - Same credentials for dev/staging/prod
   - **Recommendation**: Use environment variables

## Recommendations

### Immediate Actions:

1. **Remove Hardcoded Credentials**
   ```typescript
   // Use environment variables instead
   const DEFAULT_DB_CONFIG = {
     sqlhost: import.meta.env.VITE_DB_HOST || '',
     sqlun: import.meta.env.VITE_DB_USER || '',
     sqlpw: import.meta.env.VITE_DB_PASS || '',
     sqldb: import.meta.env.VITE_DB_NAME || '',
     sqlport: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
     sqlcharset: import.meta.env.VITE_DB_CHARSET || 'utf8mb4',
   };
   ```

2. **Move Credentials to POST Body**
   - Update API client to send credentials in request body
   - Update API endpoint to accept credentials from body
   - Remove credentials from URL query parameters

3. **Add .env File Support**
   - Create `.env.example` with placeholder values
   - Add `.env` to `.gitignore`
   - Document required environment variables

4. **Consolidate Default Configs**
   - Remove duplicate `DEFAULT_MYSQL_CONFIG` from `mysqlTableApi.ts`
   - Import from `mysqlApi.ts` or create shared config file

### Long-Term Improvements:

1. **Server-Side Proxy**
   - Create backend API that handles database connections
   - Frontend only sends operation requests, not credentials
   - Credentials stored server-side only

2. **Credential Encryption**
   - Encrypt credentials before storing in localStorage
   - Use Web Crypto API or similar
   - Decrypt only when needed

3. **Environment-Based Configuration**
   - Separate configs for dev/staging/prod
   - Use build-time environment variables
   - Validate required env vars on startup

4. **Credential Rotation Support**
   - Add ability to update credentials without code changes
   - Support for multiple database connections
   - Connection pooling and failover

## Current Configuration Flow

```
1. App Start
   ↓
2. MySQLApiClient Constructor
   ↓
3. Load from localStorage ('mysql_config')
   ↓
4. Merge with DEFAULT_DB_CONFIG
   ↓
5. Use merged config for all API requests
   ↓
6. Credentials sent in URL query params
```

## Files Requiring Updates

1. `src/lib/mysqlApi.ts` - Remove hardcoded defaults, add env var support
2. `src/lib/mysqlTableApi.ts` - Remove duplicate config, import from mysqlApi
3. `src/components/settings/MySQLSettings.tsx` - Add encryption option
4. `api/config.php` - Verify and update host IP
5. `.env.example` - Create template file
6. `.gitignore` - Ensure .env is ignored

## Summary

**Current State**: ⚠️ **Security Risk** - Credentials hardcoded and exposed
**Priority**: 🔴 **High** - Immediate action required
**Impact**: Credentials accessible to anyone with code access or browser access

**Recommended Next Steps**:
1. Create `.env` file structure
2. Move all hardcoded credentials to environment variables
3. Update API to accept credentials in POST body
4. Add credential encryption for localStorage
5. Document configuration process

