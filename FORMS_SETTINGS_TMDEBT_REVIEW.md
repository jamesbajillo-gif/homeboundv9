# Forms Settings - tmdebt_ Prefix Review

## Summary
✅ **All forms/qualification settings are correctly using the `tmdebt_` prefix**

## Components Reviewed

### 1. FormsSettings.tsx (`src/pages/settings/FormsSettings.tsx`)
- **Status**: ✅ No direct database calls
- **Uses**: `QuestionnaireSettings` component (which uses correct prefixes)

---

### 2. QualificationFormSettings.tsx (`src/components/settings/QualificationFormSettings.tsx`)
- **Status**: ✅ **All tables use `tmdebt_` prefix**

**Tables Used**:
- ✅ `tmdebt_qualification_form_fields` (lines 49, 64, 92, 125)
  - `getAll()` - Fetch all form fields
  - `updateById()` - Update field properties
  - `updateById()` - Toggle active status
  - `updateById()` - Update dropdown options

**localStorage Keys**:
- ✅ `tmdebt_settings_access_level` (line 42)

---

### 3. QuestionnaireSettings.tsx (`src/components/settings/QuestionnaireSettings.tsx`)
- **Status**: ✅ **Uses hooks that use correct prefixes**

**Indirect Tables Used** (via `useQualificationConfig` hook):
- ✅ `tmdebt_app_settings` - Stores qualification config JSON
- ✅ `tmdebt_script` - Fallback for legacy script format

**No direct database calls** - All database operations go through `useQualificationConfig` hook

---

### 4. useQualificationConfig.ts (`src/hooks/useQualificationConfig.ts`)
- **Status**: ✅ **All tables use `tmdebt_` prefix**

**Tables Used**:
- ✅ `tmdebt_app_settings` (lines 28, 73)
  - `findOneByField()` - Load qualification config
  - `upsertByFields()` - Save qualification config
- ✅ `tmdebt_script` (line 43)
  - `findOneByField()` - Fallback for legacy format

**Config Keys**:
- ✅ `tmdebt_qualification_config_inbound` (line 20)
- ✅ `tmdebt_qualification_config_outbound` (line 20)

---

### 5. useQualificationFields.ts (`src/hooks/useQualificationFields.ts`)
- **Status**: ✅ **All tables use `tmdebt_` prefix**

**Tables Used**:
- ✅ `tmdebt_qualification_form_fields` (line 26)
  - `getAll()` - Fetch active form fields

---

## Related Components (Not in Forms Settings, but related)

### 6. QualificationScriptSelector.tsx
- **Status**: ✅ **Uses correct prefixes**
- **Tables**: `tmdebt_app_settings` (via hooks)
- **Storage Keys**: `tmdebt_qualification_script_selected_{scriptName}`

### 7. ListIdQualificationSelector.tsx
- **Status**: ✅ **Uses correct prefixes**
- **Tables**: `tmdebt_app_settings` (via hooks)
- **Storage Keys**: `tmdebt_qualification_script_selected_listid_{listId}`

### 8. useScriptQualificationConfig.ts
- **Status**: ✅ **Uses correct prefixes**
- **Tables**: `tmdebt_app_settings`, `tmdebt_script_question_alts`

---

## Table Usage Summary

| Table Name | Component/Hook | Status |
|------------|---------------|--------|
| `tmdebt_qualification_form_fields` | QualificationFormSettings.tsx<br>useQualificationFields.ts | ✅ Correct |
| `tmdebt_app_settings` | useQualificationConfig.ts<br>QualificationScriptSelector.tsx<br>ListIdQualificationSelector.tsx | ✅ Correct |
| `tmdebt_script` | useQualificationConfig.ts (fallback) | ✅ Correct |
| `tmdebt_script_question_alts` | useScriptQuestionAlts.ts | ✅ Correct |

---

## Storage Keys Summary

| Key Pattern | Used By | Status |
|------------|---------|--------|
| `tmdebt_qualification_config_{inbound\|outbound}` | useQualificationConfig.ts | ✅ Correct |
| `tmdebt_qualification_script_selected_{scriptName}` | QualificationScriptSelector.tsx | ✅ Correct |
| `tmdebt_qualification_script_selected_listid_{listId}` | ListIdQualificationSelector.tsx | ✅ Correct |
| `tmdebt_settings_access_level` | QualificationFormSettings.tsx | ✅ Correct |
| `tmdebt_qualification_form_draft_{listId}_{groupType}` | QualificationForm.tsx | ✅ Correct |
| `tmdebt_qualification_question_selections_{scriptName}` | QualificationSection.tsx | ✅ Correct |

---

## Conclusion

✅ **All forms and qualification settings are correctly using the `tmdebt_` prefix**

- All database tables use `tmdebt_` prefix
- All localStorage keys use `tmdebt_` prefix
- All app settings keys use `tmdebt_` prefix
- No legacy non-prefixed tables or keys found

**No changes needed** - The forms/qualification system is fully compliant with the `tmdebt_` prefix requirement.

