# Campaign Parameter Support Guide

## Overview

The application now supports a `campaign` URL parameter that allows loading different data and configurations based on the selected campaign. This enables multi-tenant functionality where different campaigns (e.g., "homebound" and "tmdebt") can have separate database tables and configurations.

## URL Parameter

Add `campaign=homebound` or `campaign=tmdebt` to the URL query string:

```
http://your-domain.com/?campaign=homebound
http://your-domain.com/?campaign=tmdebt
```

**Default**: If no campaign parameter is provided, the application defaults to `tmdebt`.

## How It Works

### 1. Campaign Detection

The `CampaignContext` automatically parses the `campaign` parameter from the URL and provides it throughout the application via the `useCampaign()` hook.

### 2. Table Name Prefixing

Table names are automatically prefixed based on the campaign:
- `campaign=homebound` → Tables prefixed with `homebound_` (e.g., `homebound_script`, `homebound_list_id_config`)
- `campaign=tmdebt` → Tables prefixed with `tmdebt_` (e.g., `tmdebt_script`, `tmdebt_list_id_config`)

### 3. Database Configuration

Each campaign can have its own database configuration stored in localStorage:
- `homebound_mysql_config` - Database config for homebound campaign
- `tmdebt_mysql_config` - Database config for tmdebt campaign

If a campaign-specific config is not found, it falls back to the default `tmdebt_mysql_config` for backward compatibility.

## Usage

### Using Campaign Context

```typescript
import { useCampaign } from '@/contexts/CampaignContext';

function MyComponent() {
  const { campaign, isHomebound, isTmdebt } = useCampaign();
  
  return (
    <div>
      <p>Current campaign: {campaign}</p>
      {isHomebound && <p>Homebound mode active</p>}
      {isTmdebt && <p>TM Debt mode active</p>}
    </div>
  );
}
```

### Using Campaign-Aware MySQL API

The `MySQLApiClient` automatically handles campaign-aware table names when initialized with a campaign:

```typescript
import { useCampaignMySQLApi } from '@/hooks/useCampaignMySQLApi';

function MyComponent() {
  const mysqlApi = useCampaignMySQLApi();
  
  // This will automatically use the correct campaign-prefixed table
  // e.g., 'homebound_script' or 'tmdebt_script' based on URL parameter
  const scripts = await mysqlApi.getAll('script');
}
```

### Using Campaign-Aware Table Names

```typescript
import { useCampaignTableName } from '@/hooks/useCampaignMySQLApi';

function MyComponent() {
  const tableName = useCampaignTableName('script');
  // Returns 'homebound_script' or 'tmdebt_script' based on campaign
}
```

### Manual Table Name Resolution

```typescript
import { getCampaignTableName, Campaign } from '@/contexts/CampaignContext';

const campaign: Campaign = 'homebound';
const tableName = getCampaignTableName(campaign, 'script');
// Returns 'homebound_script'
```

## Campaign-Specific Configuration

### Storing Campaign Config

```typescript
import { saveCampaignMySQLConfig, saveCampaignSetting } from '@/lib/campaignConfig';
import { Campaign } from '@/contexts/CampaignContext';

// Save database config for a campaign
saveCampaignMySQLConfig('homebound', {
  sqlhost: '192.168.1.100',
  sqlun: 'homebound_user',
  sqlpw: 'password',
  sqldb: 'homebound_db',
});

// Save any setting for a campaign
saveCampaignSetting('homebound', 'debug_mode', true);
```

### Loading Campaign Config

```typescript
import { getCampaignMySQLConfig, getCampaignSetting } from '@/lib/campaignConfig';

// Load database config
const config = getCampaignMySQLConfig('homebound');

// Load any setting
const debugMode = getCampaignSetting<boolean>('homebound', 'debug_mode');
```

## Database Setup

When using campaign parameters, you need to create separate tables for each campaign:

### For Homebound Campaign

```sql
CREATE TABLE IF NOT EXISTS `homebound_script` (
    -- same structure as tmdebt_script
);

CREATE TABLE IF NOT EXISTS `homebound_list_id_config` (
    -- same structure as tmdebt_list_id_config
);

-- ... other tables with homebound_ prefix
```

### For TM Debt Campaign

```sql
CREATE TABLE IF NOT EXISTS `tmdebt_script` (
    -- existing structure
);

-- ... other existing tables
```

## Migration Strategy

### Option 1: Separate Tables (Recommended)

Create separate tables for each campaign with campaign-specific prefixes. This provides complete data isolation.

**Pros:**
- Complete data isolation
- Easy to manage and backup separately
- No risk of data mixing

**Cons:**
- More tables to manage
- Requires migration of existing data if switching campaigns

### Option 2: Shared Tables with Campaign Column

Add a `campaign` column to existing tables and filter by campaign in queries.

**Pros:**
- Single set of tables
- Easier to query across campaigns

**Cons:**
- Risk of data mixing if queries don't filter correctly
- More complex query logic

**Current Implementation**: Uses Option 1 (separate tables with prefixes)

## Backward Compatibility

- If no `campaign` parameter is provided, defaults to `tmdebt`
- Existing code using `mysqlApi` directly (without campaign) will continue to work but will use `tmdebt_` prefixed tables
- The default `tmdebt_mysql_config` localStorage key is still supported for backward compatibility

## Examples

### Example 1: Loading Scripts Based on Campaign

```typescript
import { useCampaignMySQLApi } from '@/hooks/useCampaignMySQLApi';

function ScriptList() {
  const mysqlApi = useCampaignMySQLApi();
  const [scripts, setScripts] = useState([]);

  useEffect(() => {
    // Automatically uses correct campaign table (homebound_script or tmdebt_script)
    mysqlApi.getAll('script').then(setScripts);
  }, []);

  return <div>{/* render scripts */}</div>;
}
```

### Example 2: Conditional Rendering Based on Campaign

```typescript
import { useCampaign } from '@/contexts/CampaignContext';

function CampaignSpecificFeature() {
  const { isHomebound, isTmdebt } = useCampaign();

  return (
    <div>
      {isHomebound && <HomeboundSpecificComponent />}
      {isTmdebt && <TmdebtSpecificComponent />}
    </div>
  );
}
```

### Example 3: Campaign-Specific Settings

```typescript
import { useCampaign } from '@/contexts/CampaignContext';
import { getCampaignSetting, saveCampaignSetting } from '@/lib/campaignConfig';

function SettingsComponent() {
  const { campaign } = useCampaign();
  const [setting, setSetting] = useState(null);

  useEffect(() => {
    const saved = getCampaignSetting(campaign, 'my_setting');
    setSetting(saved);
  }, [campaign]);

  const handleSave = (value) => {
    saveCampaignSetting(campaign, 'my_setting', value);
  };

  return <div>{/* settings UI */}</div>;
}
```

## Testing

To test campaign functionality:

1. **Test Homebound Campaign:**
   ```
   http://localhost:8080/?campaign=homebound
   ```

2. **Test TM Debt Campaign:**
   ```
   http://localhost:8080/?campaign=tmdebt
   ```

3. **Test Default (no parameter):**
   ```
   http://localhost:8080/
   ```
   Should default to `tmdebt`

## Notes

- Campaign is determined at page load from URL parameters
- Campaign persists for the session but can be changed by updating the URL
- All database operations automatically use campaign-aware table names when using `useCampaignMySQLApi()`
- Campaign-specific configurations are stored separately in localStorage

