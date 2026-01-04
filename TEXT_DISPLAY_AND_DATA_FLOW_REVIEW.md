# Text Display and Data Flow Review

## Overview
This document reviews how text is displayed during editing vs after editing, and traces the complete data flow for saving, fetching, and updating script content.

## Current Implementation Issues

### 1. **Text Display Differences**

#### During Editing (RichTextEditor)
- **Component**: `RichTextEditor` (contentEditable div)
- **Format**: HTML content stored in `innerHTML`
- **Features**: 
  - WYSIWYG editing with toolbar
  - Bold, Italic, Font Size, Font Color controls
  - Real-time formatting preview
- **Storage**: HTML string in React state (`editText` or `newAltText`)

#### After Editing (Display Mode)
- **Component**: Conditional rendering based on HTML detection
- **Format Detection**: Basic check `processedText.includes('<') && processedText.includes('>')`
- **HTML Display**: Uses `dangerouslySetInnerHTML` to render HTML
- **Plain Text Display**: Uses `<pre>` tag with `whitespace-pre-wrap`
- **Issue**: HTML detection is too simplistic - may fail for edge cases

### 2. **Data Flow**

#### Saving Flow
```
User edits in RichTextEditor
  ↓
editText state (HTML string)
  ↓
handleSaveEdit() calls editText.trim()
  ↓
saveAlternative() or addAlternative()
  ↓
useSpielAlternatives hook
  ↓
mysqlApi.upsertByFields('tmdebt_spiel_alts', { alt_text: text })
  ↓
Database: tmdebt_spiel_alts.alt_text (TEXT column)
```

**Problem**: `.trim()` on HTML may remove leading/trailing whitespace but doesn't sanitize HTML. HTML is saved as-is to database.

#### Fetching Flow
```
Component mounts
  ↓
useSpielAlternatives hook fetches from 'tmdebt_spiel_alts'
  ↓
mysqlApi.findByField('tmdebt_spiel_alts', 'script_name', scriptName)
  ↓
alternatives array with alt_text (HTML or plain text)
  ↓
unifiedList built from alternatives
  ↓
currentItem.text contains the HTML/plain text
  ↓
Display: processedText = replaceScriptVariables(currentItem.text)
  ↓
Rendered based on isHTML check
```

#### Update Flow
```
User clicks Edit
  ↓
handleStartEdit() sets editText = currentItem.text
  ↓
RichTextEditor receives value prop
  ↓
useEffect sets editorRef.current.innerHTML = value
  ↓
User edits with formatting
  ↓
onInput handler calls onChange(editorRef.current.innerHTML)
  ↓
editText state updated with HTML
  ↓
User clicks Save
  ↓
handleSaveEdit() calls saveAlternative(..., editText.trim())
  ↓
Database updated via upsertByFields
  ↓
React Query cache invalidated
  ↓
Component refetches data
  ↓
Display updates with new content
```

## Issues Identified

### Issue 1: HTML Trimming
**Location**: `src/components/SpielDisplay.tsx:323, 337`
```typescript
await addAlternative(currentItem.spielId, editText.trim());
await saveAlternative(currentItem.spielId, editText.trim(), currentItem.altOrder);
```

**Problem**: `.trim()` removes leading/trailing whitespace, but for HTML this might:
- Remove intentional whitespace in HTML structure
- Not properly handle HTML entities
- May break formatting if HTML starts/ends with whitespace

**Recommendation**: Don't trim HTML content, or use a more sophisticated HTML trim function.

### Issue 2: HTML Detection
**Location**: `src/components/SpielDisplay.tsx:439`
```typescript
const isHTML = processedText.includes('<') && processedText.includes('>');
```

**Problem**: 
- Too simplistic - may fail for:
  - Plain text containing `<` or `>` characters
  - Malformed HTML
  - HTML comments or CDATA sections
  - Script variables like `[First Name]` that don't contain HTML

**Recommendation**: Use a more robust HTML detection method or store a flag in the database.

### Issue 3: Variable Replacement with HTML
**Location**: `src/components/SpielDisplay.tsx:438`
```typescript
const processedText = currentItem ? replaceScriptVariables(currentItem.text, leadData) : "";
```

**Problem**: `replaceScriptVariables` uses regex replacement on the entire string. If the content is HTML:
- Variables inside HTML tags might be replaced incorrectly
- HTML structure might be broken
- Variables in attributes won't be replaced

**Recommendation**: Parse HTML and replace variables only in text nodes, not in HTML tags/attributes.

### Issue 4: Data Type Inconsistency
**Location**: Database schema and usage

**Problem**: 
- Database stores `alt_text` as TEXT (can hold HTML)
- No flag to indicate if content is HTML or plain text
- Display logic must guess based on content

**Recommendation**: Add a `content_type` field (enum: 'plain', 'html') to track format.

## Database Tables Involved

### 1. `tmdebt_spiel_alts`
- **Purpose**: Stores alternative spiel text
- **Key Fields**:
  - `alt_text` (TEXT) - The script content (HTML or plain text)
  - `script_name` (VARCHAR) - Script identifier
  - `spiel_id` (VARCHAR) - Spiel identifier
  - `alt_order` (INT) - Order of alternative

### 2. `tmdebt_script`
- **Purpose**: Stores base script content
- **Key Fields**:
  - `content` (TEXT) - Base script content
  - `step_name` (VARCHAR) - Unique step identifier

### 3. `tmdebt_script_submissions`
- **Purpose**: Stores user-submitted scripts awaiting approval
- **Key Fields**:
  - `alt_text` (TEXT) - Submitted script content

## Recommendations

### Immediate Fixes

1. **Remove `.trim()` for HTML content**
   ```typescript
   // Instead of editText.trim(), check if it's HTML first
   const textToSave = isHTML ? editText : editText.trim();
   ```

2. **Improve HTML detection**
   ```typescript
   const isHTML = /<[a-z][\s\S]*>/i.test(processedText);
   ```

3. **Better variable replacement for HTML**
   - Parse HTML DOM
   - Replace variables only in text nodes
   - Preserve HTML structure

### Long-term Improvements

1. **Add content_type field to database**
   ```sql
   ALTER TABLE tmdebt_spiel_alts 
   ADD COLUMN content_type ENUM('plain', 'html') DEFAULT 'plain';
   ```

2. **Sanitize HTML on save**
   - Use DOMPurify or similar
   - Remove dangerous tags/attributes
   - Preserve formatting tags only

3. **Consistent formatting**
   - Store formatting preferences
   - Apply consistent styles
   - Better variable replacement in HTML context

