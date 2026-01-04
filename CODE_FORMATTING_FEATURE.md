# Code Formatting Feature

## Overview
Added code formatting support to the agent interface WYSIWYG editor, allowing users to format text as inline code or code blocks.

## Features Added

### 1. Inline Code Formatting
- **Button**: Code icon button in toolbar
- **Keyboard Shortcut**: `Ctrl+` (backtick) or `Cmd+` on Mac
- **Format**: Wraps selected text in `<code>` tags
- **Styling**: 
  - Monospace font
  - Light background color
  - Padding and border radius
  - Inline display

### 2. Code Block Formatting
- **Button**: Code2 icon button in toolbar (represents code blocks)
- **Format**: Wraps selected text in `<pre><code>` tags
- **Styling**:
  - Monospace font
  - Block-level display
  - Background color
  - Padding and border radius
  - Horizontal scroll for long lines
  - Preserves whitespace and line breaks

### 3. Display Support
- Code blocks and inline code are properly styled when displayed
- Uses Tailwind CSS classes for consistent styling
- Inline code: `[&_code]:font-mono [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded`
- Code blocks: `[&_pre]:font-mono [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto`

## Implementation Details

### RichTextEditor Component
- Added `isCode` and `isCodeBlock` state to track formatting
- Added `handleInlineCode()` function for inline code formatting
- Added `handleCodeBlock()` function for code block formatting
- Updated formatting state detection to recognize code elements
- Added keyboard shortcut support for inline code (`Ctrl+`)

### SpielDisplay Component
- Updated HTML display to include code styling classes
- Code blocks and inline code are properly rendered with appropriate styling

## Usage

### Inline Code
1. Select text in the editor
2. Click the Code button (or press `Ctrl+`)
3. Text is wrapped in inline code formatting
4. Click again to remove formatting

### Code Block
1. Select text in the editor (or place cursor for empty block)
2. Click the Code Block button
3. Text is wrapped in a code block
4. Click again to convert back to normal text

## Styling

### Inline Code
```css
font-family: monospace;
background-color: rgba(0, 0, 0, 0.05);
padding: 2px 4px;
border-radius: 3px;
```

### Code Blocks
```css
font-family: monospace;
background-color: rgba(0, 0, 0, 0.05);
padding: 12px;
border-radius: 4px;
overflow-x: auto;
white-space: pre;
margin: 8px 0;
```

## Files Modified
- `src/components/RichTextEditor.tsx` - Added code formatting buttons and handlers
- `src/components/SpielDisplay.tsx` - Added code styling to display

## Keyboard Shortcuts
- `Ctrl+B` / `Cmd+B` - Bold
- `Ctrl+I` / `Cmd+I` - Italic
- `Ctrl+` / `Cmd+` - Inline Code (new)

## Future Enhancements
- Syntax highlighting for code blocks
- Language selection for code blocks
- Copy code block button
- Line numbers for code blocks

