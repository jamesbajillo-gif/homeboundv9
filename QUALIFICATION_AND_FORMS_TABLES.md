# Qualification Forms and Questionnaires - Database Tables

This document outlines all database tables used for forms, questionnaires, and qualification functionality.

## Primary Tables

### 1. `tmdebt_qualification_form_fields`
**Purpose**: Stores dynamic form field definitions for qualification forms

**Key Fields**:
- `id` - Primary key
- `field_name` - Unique field identifier (e.g., 'customer_email', 'borrower_first_name')
- `field_label` - Display label for the field
- `field_type` - Field type (text, email, phone, date, select, checkbox, etc.)
- `field_section` - Section this field belongs to (personal, property, loan, financial)
- `field_options` - JSON options for select/radio fields
- `is_required` - Whether this field is required
- `zapier_field_name` - Field name mapping for Zapier integration
- `placeholder` - Placeholder text for the field
- `help_text` - Help text or description
- `validation_rules` - JSON validation rules
- `display_order` - Display order within the section
- `is_active` - Whether this field is active/enabled

**Used By**:
- `QualificationFormSettings.tsx` - Manages form field configuration
- `useQualificationFields.ts` - Hook to fetch form fields
- `QualificationForm.tsx` - Renders the actual form

**Indexes**:
- `field_name` (UNIQUE)
- `idx_field_section`
- `idx_display_order`
- `idx_is_active`

---

### 2. `tmdebt_script_question_alts`
**Purpose**: Stores script-specific question text overrides and alternatives for qualification questions

**Key Fields**:
- `id` - Primary key
- `script_name` - Script identifier (e.g., 'inbound_qualification', 'outbound_qualification')
- `question_id` - Reference to the question ID from qualification config
- `alt_text` - The alternative question text
- `alt_order` - Order of this alternative within the question
- `is_default` - Whether this is the default selection for this script

**Used By**:
- `useScriptQuestionAlts.ts` - Hook to manage script-specific question alternatives
- `QualificationSection.tsx` - Displays and cycles through question alternatives
- `QualificationScriptSelector.tsx` - Allows selecting questions for scripts
- `ListIdQualificationSelector.tsx` - List ID specific question selection

**Indexes**:
- `unique_script_question_order` (UNIQUE: script_name, question_id, alt_order)
- `idx_script_name`
- `idx_question_id`

**Example Usage**:
- Allows different question phrasings for inbound vs outbound calls
- Supports multiple alternative ways to ask the same question
- Enables randomization or cycling through question variants

---

### 3. `tmdebt_app_settings`
**Purpose**: Stores qualification configuration as JSON in key-value format

**Key Fields**:
- `setting_key` - Unique setting key
  - `tmdebt_qualification_config_inbound` - Master qualification config for inbound
  - `tmdebt_qualification_config_outbound` - Master qualification config for outbound
- `setting_value` - JSON string containing the qualification configuration
- `setting_type` - Type of setting (typically 'json')

**Qualification Config Structure** (stored as JSON):
```typescript
{
  sections: [
    {
      id: string,
      title: string,
      questions: [
        {
          id: string,
          text: string,
          fieldName: string | null,
          fieldType: string,
          alternatives?: Array<{ id: string, text: string }>,
          order: number,
          enabled: boolean
        }
      ]
    }
  ]
}
```

**Used By**:
- `useQualificationConfig.ts` - Manages master qualification configuration
- `useScriptQualificationConfig.ts` - Gets script-specific qualification config
- `QuestionnaireSettings.tsx` - UI for configuring the questionnaire
- `QualificationScriptSelector.tsx` - Selects questions for scripts

**Storage Keys**:
- `tmdebt_qualification_config_inbound` - Inbound qualification questions
- `tmdebt_qualification_config_outbound` - Outbound qualification questions
- `tmdebt_qualification_script_selected_{scriptName}` - Selected questions per script
- `tmdebt_qualification_script_selected_listid_{listId}` - Selected questions per list ID

---

## Related Tables (Not Directly Form/Questionnaire)

### 4. `tmdebt_script`
**Purpose**: Stores call script content, including qualification scripts

**Relevance**: 
- Stores the qualification script content (questions) in the `content` field
- For qualification steps, content may contain JSON with section-based questions
- `step_name` values: 'inbound_qualification', 'outbound_qualification', 'qualification'

**Used By**:
- `ScriptEditor.tsx` - Edits qualification scripts
- `QualificationScriptSelector.tsx` - References qualification scripts

---

### 5. `tmdebt_list_id_config`
**Purpose**: Stores list ID-specific script overrides

**Relevance**:
- Can override qualification scripts for specific list IDs
- `step_name` can be 'inbound_qualification' or 'outbound_qualification'

**Used By**:
- `ListIdQualificationSelector.tsx` - Configures list ID specific qualification questions

---

## Data Flow

### 1. Master Questionnaire Configuration
```
QuestionnaireSettings.tsx
  ↓ (saves to)
tmdebt_app_settings (setting_key: tmdebt_qualification_config_{inbound|outbound})
  ↓ (read by)
useQualificationConfig.ts
  ↓ (used by)
QualificationScriptSelector.tsx / ListIdQualificationSelector.tsx
```

### 2. Script-Specific Question Selection
```
QualificationScriptSelector.tsx
  ↓ (saves selected questions to)
tmdebt_app_settings (setting_key: tmdebt_qualification_script_selected_{scriptName})
  ↓ (read by)
useScriptQualificationConfig.ts
  ↓ (merged with master config)
QualificationForm.tsx (displays questions)
```

### 3. Question Alternatives
```
QualificationSection.tsx (user edits question)
  ↓ (saves to)
tmdebt_script_question_alts (script_name, question_id, alt_text)
  ↓ (read by)
useScriptQuestionAlts.ts
  ↓ (displayed in)
QualificationSection.tsx (cycles through alternatives)
```

### 4. Form Fields (Legacy/Alternative System)
```
QualificationFormSettings.tsx
  ↓ (saves to)
tmdebt_qualification_form_fields
  ↓ (read by)
useQualificationFields.ts
  ↓ (used for form field mapping)
```

---

## Summary

**Primary Tables for Forms/Questionnaires**:
1. ✅ **`tmdebt_qualification_form_fields`** - Form field definitions
2. ✅ **`tmdebt_script_question_alts`** - Question alternatives per script
3. ✅ **`tmdebt_app_settings`** - Qualification configuration (JSON)

**Supporting Tables**:
4. `tmdebt_script` - Script content storage
5. `tmdebt_list_id_config` - List ID specific overrides

**Key Storage Keys in `tmdebt_app_settings`**:
- `tmdebt_qualification_config_inbound` - Master inbound questionnaire
- `tmdebt_qualification_config_outbound` - Master outbound questionnaire
- `tmdebt_qualification_script_selected_{scriptName}` - Selected questions per script
- `tmdebt_qualification_script_selected_listid_{listId}` - Selected questions per list ID

**localStorage Keys** (for drafts/selections):
- `tmdebt_qualification_form_draft_{listId}_{groupType}` - Form draft data
- `tmdebt_qualification_question_selections_{scriptName}` - Selected alternative indices

