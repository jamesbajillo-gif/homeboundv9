# Questionnaire Selection Logic Fix

## Problem Analysis

### Current Issue
When adding a new questionnaire tab in the settings interface, the dialog allowed selecting between "Inbound Qualification" and "Outbound Qualification" regardless of which page you were on:

- **InboundScripts page**: Could select "Inbound Qualification" OR "Outbound Qualification"
- **OutboundScripts page**: Could select "Outbound Qualification" OR "Inbound Qualification"

### Why This Was Problematic

1. **Misalignment with Configuration**: 
   - The tab is scoped to `group_type` (inbound/outbound) in the database
   - Inbound scripts should only use `tmdebt_qualification_config_inbound`
   - Outbound scripts should only use `tmdebt_qualification_config_outbound`
   - There's no valid use case for mixing them

2. **Confusing UX**: 
   - Users shouldn't need to choose between questionnaires when the choice is already determined by the page they're on
   - The dropdown added unnecessary complexity

3. **Data Integrity**: 
   - Allowing cross-selection could lead to inconsistent data where an inbound tab uses outbound questionnaire config

## Solution

### Changes Made

1. **Removed Questionnaire Dropdown**: 
   - Eliminated the `Select` dropdown for choosing between inbound/outbound questionnaires
   - Replaced with an informational display showing which questionnaire will be used

2. **Automatic Selection Based on `groupType`**:
   - `groupType === "inbound"` → automatically uses `"inbound_qualification"`
   - `groupType === "outbound"` → automatically uses `"outbound_qualification"`
   - The questionnaire script name is now derived directly from `groupType`

3. **Simplified State Management**:
   - Removed `questionnaireScriptName` state variable
   - Now computed directly from `tabType` and `groupType`
   - Updated `useEffect` dependencies to remove `questionnaireScriptName`

4. **Updated Config Loading**:
   - Changed from deriving config group type from `questionnaireScriptName` to using `groupType` directly
   - More reliable and consistent

### Code Changes

**Before:**
```typescript
const [questionnaireScriptName, setQuestionnaireScriptName] = useState<string>("");
// ... dropdown to select questionnaire ...
```

**After:**
```typescript
// Automatically determine questionnaire script name based on groupType
const questionnaireScriptName = tabType === "questionnaire" 
  ? (groupType === "outbound" ? "outbound_qualification" : "inbound_qualification")
  : "";
```

## Database Migration

Created `database-migration-add-questionnaire-tabs-homebound.sql` to add the missing columns to `homebound_` tables:
- `tab_type` ENUM('script', 'questionnaire')
- `questionnaire_script_name` VARCHAR(100)
- `selected_section_ids` TEXT

This migration script is idempotent and safe to run multiple times.

## Benefits

1. **Simpler UX**: Users no longer need to make an unnecessary choice
2. **Data Consistency**: Ensures tabs always use the correct questionnaire for their group type
3. **Less Error-Prone**: Eliminates possibility of selecting wrong questionnaire type
4. **Clearer Intent**: The UI now clearly shows which questionnaire will be used based on context

## Files Modified

- `src/components/settings/AddTabDialog.tsx` - Removed questionnaire dropdown, added automatic selection
- `database-migration-add-questionnaire-tabs-homebound.sql` - New migration script for homebound tables

