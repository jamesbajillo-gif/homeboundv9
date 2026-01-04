# Campaign Mapping Guide

## Overview

The Campaign Mapping feature allows you to map campaign variables (URL parameters) to campaign prefixes. This ensures that different campaign parameter formats (e.g., `HBL_camp`, `homebound`, `TM_debt`, `tmdebt`) are correctly translated to the appropriate campaign prefix (`homebound` or `tmdebt`).

## Purpose

When URLs contain campaign parameters in various formats, the system needs to know which campaign they refer to:

- `?campaign=HBL_camp` → should map to `homebound` campaign
- `?campaign=homebound` → should map to `homebound` campaign  
- `?campaign=TM_debt` → should map to `tmdebt` campaign
- `?campaign=tmdebt` → should map to `tmdebt` campaign

## Default Mappings

The system comes with default mappings:

| Campaign Variable | Campaign Prefix |
|-----------------|----------------|
| `homebound` | `homebound` |
| `hbl_camp` | `homebound` |
| `tmdebt` | `tmdebt` |
| `tm_debt` | `tmdebt` |

## Managing Mappings

### Accessing Campaign Mapping Settings

1. Navigate to **Settings** (`/settings`)
2. Go to **Adv Configuration** section
3. Click on **Campaign Mapping**

### Adding a New Mapping

1. Enter the campaign variable (e.g., `HBL_camp`, `TM_debt`)
2. Select the campaign prefix it should map to (`homebound` or `tmdebt`)
3. Click **Add**

**Note**: Campaign variables are automatically converted to lowercase and trimmed.

### Deleting a Mapping

Click the trash icon next to any mapping to remove it.

## How It Works

### 1. URL Parameter Detection

When a URL contains `?campaign=HBL_camp`, the system:

1. Checks if the parameter is a direct campaign name (`homebound` or `tmdebt`)
2. If not, looks up the parameter in the campaign mappings
3. Uses the mapped campaign prefix
4. Falls back to default mappings if not found in database
5. Defaults to `tmdebt` if no mapping exists

### 2. Caching

Mappings are cached in localStorage (`tmdebt_campaign_mappings_cache`) for fast synchronous access during initial page load. The cache is automatically updated when mappings are saved.

### 3. Storage

Mappings are stored in the `tmdebt_app_settings` table with the key `tmdebt_campaign_mappings` as a JSON array:

```json
[
  {
    "campaign_variable": "hbl_camp",
    "campaign_prefix": "homebound"
  },
  {
    "campaign_variable": "tm_debt",
    "campaign_prefix": "tmdebt"
  }
]
```

## Examples

### Example 1: Homebound Campaign Variants

If you have multiple ways to refer to the homebound campaign:

- `?campaign=homebound` → `homebound`
- `?campaign=HBL_camp` → `homebound`
- `?campaign=HBL` → `homebound` (if you add this mapping)

### Example 2: TM Debt Campaign Variants

If you have multiple ways to refer to the tmdebt campaign:

- `?campaign=tmdebt` → `tmdebt`
- `?campaign=TM_debt` → `tmdebt`
- `?campaign=TMDEBT` → `tmdebt` (if you add this mapping)

## Best Practices

1. **Use Lowercase**: Campaign variables are automatically normalized to lowercase, so `HBL_camp` and `hbl_camp` are treated the same.

2. **Avoid Duplicates**: The system prevents duplicate campaign variables. Each variable should map to exactly one campaign prefix.

3. **Keep Defaults**: The default mappings (`homebound`, `hbl_camp`, `tmdebt`, `tm_debt`) are always available as fallbacks, even if you delete them from the database.

4. **Test Mappings**: After adding new mappings, test them by accessing the application with the new campaign parameter format.

## Technical Details

### Files Involved

- **`src/hooks/useCampaignMappings.ts`**: Hook for managing campaign mappings (CRUD operations)
- **`src/components/settings/CampaignMappingSettings.tsx`**: UI component for managing mappings
- **`src/pages/settings/CampaignMappingPage.tsx`**: Settings page for campaign mapping
- **`src/contexts/CampaignContext.tsx`**: Campaign detection logic that uses mappings
- **`src/lib/mysqlApi.ts`**: MySQL API client that uses mappings for campaign detection

### Database Schema

Mappings are stored in `tmdebt_app_settings`:

```sql
setting_key: 'tmdebt_campaign_mappings'
setting_value: '[{"campaign_variable":"hbl_camp","campaign_prefix":"homebound"},...]'
setting_type: 'json'
```

### Cache Key

LocalStorage key: `tmdebt_campaign_mappings_cache`

This cache is automatically updated when mappings are saved and is used for fast synchronous access during initial page load.

