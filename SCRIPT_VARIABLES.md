# Script Variable Reference

This document explains how to use bracketed variables in your call scripts that will be automatically replaced with VICI lead data.

## How It Works

Any text in brackets `[Variable Name]` in your scripts will be automatically replaced with the corresponding value from the VICI lead data when the script is displayed to agents.

## Available Variables

### Customer Information
- `[First Name]` - Lead's first name
- `[Last Name]` - Lead's last name
- `[Customer Name]` - Full name (combines first and last name)
- `[Phone]` - Primary phone number
- `[Email]` - Email address

### Location Information
- `[State]` - State or province
- `[City]` - City name
- `[Address]` - Street address
- `[Zip]` or `[Zip Code]` - Postal/zip code

### Agent Information
- `[Your Name]` - Agent's username/name from VICI
- `[Company]` or `[Company Name]` - Company name

### Call Information
- `[Date]` - Date of entry
- `[Time]` - Time information

## Custom Variables

The system also supports any custom field from your VICI setup. Use the field name in brackets:
- Example: `[custom_field_name]` will map to VICI's `custom_field_name` parameter

The system automatically:
- Tries case-insensitive matching
- Converts spaces to underscores (e.g., `[Custom Field]` matches `custom_field`)
- Searches for partial matches if exact match not found

## Example Script

```
"Hi [First Name], this is [Your Name] with [Company]. 

You're in [State], right? 

Quick question—if there's a way to use your home's equity to wipe out 
high-interest credit cards, personal loans, or even a second mortgage—and 
roll everything into one simple payment—would you want to see how that looks?"

(Pause and listen.)
```

When displayed to the agent, if VICI provides:
- `first_name=John`
- `user=Agent Smith`
- `company=ABC Lending`
- `state=California`

The script becomes:

```
"Hi John, this is Agent Smith with ABC Lending. 

You're in California, right? 

Quick question—if there's a way to use your home's equity to wipe out 
high-interest credit cards, personal loans, or even a second mortgage—and 
roll everything into one simple payment—would you want to see how that looks?"

(Pause and listen.)
```

## Best Practices

1. **Always use brackets** - Variables must be enclosed in square brackets `[Variable]`
2. **Use clear names** - Make variable names descriptive and match common VICI field names
3. **Provide fallbacks** - If a value might not exist, structure your script so it still makes sense
4. **Test with real data** - Preview scripts with actual VICI URL parameters to verify replacements

## Adding New Variable Mappings

If you need to add support for new placeholder names or VICI field mappings, edit the `PLACEHOLDER_MAPPINGS` object in `src/lib/vici-parser.ts`.
