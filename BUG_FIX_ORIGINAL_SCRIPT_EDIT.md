# Bug Fix: Original Script Editing Creates Copy Instead of Updating

## Problem
When editing the default/first entry (original script) in the agent interface, the system was creating a new alternative copy instead of updating the original script in the database.

## Root Cause
In `src/components/SpielDisplay.tsx`, the `handleSaveEdit` function had this logic:

```typescript
if (currentItem.isOriginal) {
  // Editing original - save as new alternative
  await addAlternative(currentItem.spielId, textToSave);
  // ...
}
```

This was intentionally creating a new alternative instead of updating the base script, which is incorrect behavior for editing the original.

## Solution
Modified the code to properly update the original script in the appropriate database table:

1. **Updated `SpielDisplay` component** to accept `listId` and `stepTitle` props
2. **Modified `handleSaveEdit`** to:
   - Check if editing the original script (`currentItem.isOriginal`)
   - Determine if it's a List ID script or default script
   - Update the correct table:
     - `tmdebt_list_id_config` if it's a List ID script
     - `tmdebt_script` if it's a default script
   - Invalidate React Query cache to refresh the UI
3. **Updated `ScriptDisplay`** to pass `listId` and `stepTitle` props to `SpielDisplay` components

## Changes Made

### 1. `src/components/SpielDisplay.tsx`
- Added `listId?: string | null` and `stepTitle?: string` to `SpielDisplayProps`
- Added imports: `useQueryClient`, `mysqlApi`, `QUERY_KEYS`
- Modified `handleSaveEdit` to update original scripts instead of creating alternatives

### 2. `src/components/ScriptDisplay.tsx`
- Updated all `SpielDisplay` component calls to pass:
  - `listId={usingListIdScripts ? activeListId : null}`
  - `stepTitle={sectionData?.title || section.title}`

## Database Tables Updated

### For List ID Scripts
- **Table**: `tmdebt_list_id_config`
- **Fields Updated**: `content`, `title`
- **Key**: `list_id` + `step_name`

### For Default Scripts
- **Table**: `tmdebt_script`
- **Fields Updated**: `content`, `title`
- **Key**: `step_name` (unique)

## Behavior After Fix

### Before
1. User edits original script
2. System creates new alternative in `tmdebt_spiel_alts`
3. Original script remains unchanged
4. User sees duplicate (original + new alternative)

### After
1. User edits original script
2. System updates original in `tmdebt_script` or `tmdebt_list_id_config`
3. Original script is modified
4. User sees updated original script
5. Alternatives remain separate and unchanged

## Testing Checklist
- [x] Edit original default script → Updates `tmdebt_script`
- [x] Edit original List ID script → Updates `tmdebt_list_id_config`
- [x] Edit alternative → Still creates/updates alternative (unchanged behavior)
- [x] Cache invalidation works → UI refreshes after save
- [x] HTML content preserved → Rich text formatting maintained

## Related Files
- `src/components/SpielDisplay.tsx` - Main component with edit logic
- `src/components/ScriptDisplay.tsx` - Parent component passing props
- `src/lib/queryKeys.ts` - Query key definitions for cache invalidation
- `src/lib/mysqlApi.ts` - Database API methods

