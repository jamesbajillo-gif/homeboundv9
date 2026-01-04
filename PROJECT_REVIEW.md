# Overall Project Review - MySQL API Usage

## Current State Analysis

### ✅ Pages Using MySQL API

1. **Index.tsx** - ✅ Uses via `ScriptDisplay` component
2. **InboundScripts.tsx** - ✅ Uses via `ScriptEditor` component
3. **OutboundScripts.tsx** - ✅ Uses via `ScriptEditor` component
4. **FormsSettings.tsx** - ✅ Uses via `QualificationFormSettings` component
5. **ZapierPage.tsx** - ✅ Uses via `ZapierSettings` component
6. **ListIdManagement.tsx** - ✅ Uses via `ListIdConfiguration` and `ListIdScriptEditor` components
7. **MySQLPage.tsx** - ✅ Uses via `MySQLSettings` component
8. **ImportPage.tsx** - ✅ Uses via `ImportData` component

### ⚠️ Issues Found

#### 1. **Inconsistent React Query Usage**

**Problem**: Only 3 components use React Query, rest use direct API calls
- ✅ `ListIdScriptEditorSectioned.tsx` - Uses React Query
- ✅ `ListIdScriptEditor.tsx` - Uses React Query
- ✅ `ListIdConfiguration.tsx` - Uses React Query
- ❌ `ScriptEditor.tsx` - Direct API calls, no cache invalidation
- ❌ `QualificationFormSettings.tsx` - Direct API calls, manual refetch
- ❌ `ZapierSettings.tsx` - Direct API calls, manual refetch
- ❌ `ScriptDisplay.tsx` - Direct API calls, no auto-refresh
- ❌ `useQualificationFields.ts` - Custom hook, no React Query

**Impact**: Updates don't reflect across components automatically

#### 2. **No Cache Invalidation**

**Problem**: Components that update data don't invalidate React Query cache

**Affected Components**:
- `ScriptEditor.tsx` - Updates scripts but doesn't invalidate `ScriptDisplay` cache
- `QualificationFormSettings.tsx` - Updates fields but doesn't invalidate `useQualificationFields` cache
- `ZapierSettings.tsx` - Updates webhooks but doesn't invalidate `useZapier` cache

**Impact**: Changes require manual refresh or page reload to see

#### 3. **ScriptDisplay Doesn't Auto-Refresh**

**Problem**: `ScriptDisplay` fetches scripts on mount but doesn't refetch when:
- Scripts are updated in `ScriptEditor`
- List ID scripts are updated
- Group type changes (already handled)

**Impact**: Users see stale script data after making changes

#### 4. **Missing React Query Keys**

**Problem**: No standardized query keys for:
- Scripts (`tmdebt_script`)
- Form fields (`tmdebt_qualification_form_fields`)
- Zapier webhooks (`tmdebt_zapier_settings`)

**Impact**: Cannot invalidate related queries efficiently

## Required Fixes

### Priority 1: Convert to React Query

1. **ScriptEditor.tsx**
   - Convert `fetchSection()` to `useQuery`
   - Add `useMutation` for save operations
   - Invalidate related queries after save

2. **ScriptDisplay.tsx**
   - Convert to `useQuery` with proper query keys
   - Add dependency on script updates

3. **QualificationFormSettings.tsx**
   - Convert to `useQuery` for fetching
   - Add `useMutation` for updates
   - Invalidate `useQualificationFields` cache

4. **ZapierSettings.tsx**
   - Convert to `useQuery` for fetching
   - Add `useMutation` for CRUD operations
   - Invalidate `useZapier` cache

5. **useQualificationFields.ts**
   - Convert to `useQuery` hook
   - Export query key for invalidation

### Priority 2: Standardize Query Keys

Create query key constants:
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
};
```

### Priority 3: Add Cache Invalidation

After every update operation:
1. Invalidate specific query
2. Invalidate related queries
3. Optionally refetch immediately

Example:
```typescript
// After updating script
queryClient.invalidateQueries({ queryKey: ['scripts', stepName] });
queryClient.invalidateQueries({ queryKey: ['scripts'] }); // Invalidate all
```

## Implementation Plan

### Step 1: Create Query Key Constants
- File: `src/lib/queryKeys.ts`

### Step 2: Convert ScriptEditor
- Add React Query
- Invalidate cache after save
- Update query keys

### Step 3: Convert ScriptDisplay
- Add React Query
- Watch for script updates
- Auto-refresh on changes

### Step 4: Convert QualificationFormSettings
- Add React Query
- Invalidate form fields cache

### Step 5: Convert ZapierSettings
- Add React Query
- Invalidate webhooks cache

### Step 6: Convert useQualificationFields
- Convert to React Query hook
- Export query key

### Step 7: Test Updates Reflect
- Update script → Check ScriptDisplay refreshes
- Update form field → Check QualificationForm refreshes
- Update webhook → Check useZapier refreshes

## Expected Behavior After Fixes

1. **User updates script in ScriptEditor**
   - ✅ Script saved to database
   - ✅ ScriptEditor shows updated data
   - ✅ ScriptDisplay automatically refreshes
   - ✅ All components using that script see update

2. **User updates form field**
   - ✅ Field saved to database
   - ✅ QualificationFormSettings shows updated data
   - ✅ QualificationForm automatically refreshes
   - ✅ All forms using that field see update

3. **User updates webhook**
   - ✅ Webhook saved to database
   - ✅ ZapierSettings shows updated data
   - ✅ useZapier hook automatically refreshes
   - ✅ All components using webhooks see update

## Files to Update

1. `src/lib/queryKeys.ts` - NEW - Query key constants
2. `src/components/settings/ScriptEditor.tsx` - Add React Query
3. `src/components/ScriptDisplay.tsx` - Add React Query
4. `src/components/settings/QualificationFormSettings.tsx` - Add React Query
5. `src/components/settings/ZapierSettings.tsx` - Add React Query
6. `src/hooks/useQualificationFields.ts` - Convert to React Query

