# MySQL API - Table Management

A standalone PHP API for managing MySQL tables. Supports listing tables and creating tables from SQL statements. **No configuration files required** - all database credentials must be provided with each request.

## Features

- ✅ **Standalone** - No configuration files or environment variables required
- ✅ **Table Listing** - Lists all tables from the specified database
- ✅ **Table Creation** - Create tables from SQL CREATE TABLE statements
- ✅ **Database Locked** - Can only access the database specified in `sqldb` parameter
- ✅ **IP/Domain Whitelist** - Access control via `whitelistip.cnf` with wildcard support
- ✅ **Connection Caching** - Efficient connection reuse
- ✅ **Secure Operations** - Only allows safe CREATE TABLE operations

## Database Configuration

**All database credentials must be provided with each request.** The API requires the following parameters:

### Required Parameters

- `sqlhost` - MySQL hostname (e.g., `localhost`, `127.0.0.1`, `mysql.example.com`)
- `sqlun` - MySQL username
- `sqlpw` - MySQL password
- `sqldb` - MySQL database name

### Optional Parameters

- `sqlport` - MySQL port (default: `3306`)
- `sqlcharset` - MySQL charset (default: `utf8mb4`)

### Providing Parameters

**Via Query Parameters:**
```
https://api.techpinoy.net/mysqlapi.php?sqlhost=localhost&sqlun=username&sqlpw=password&sqldb=database_name
```

**Note:** Parameters can be provided in query string. The API only accepts GET requests.

**Full URL Format:**
```
https://api.techpinoy.net/mysqlapi.php?sqlhost=HOST&sqlun=USERNAME&sqlpw=PASSWORD&sqldb=DATABASE
```

## API Endpoint

**URL**: `https://api.techpinoy.net/mysqlapi.php`

**Methods**: `GET`, `POST`

**Important:** 
- All requests must include the required database parameters (`sqlhost`, `sqlun`, `sqlpw`, `sqldb`)
- The API is locked to the database specified in `sqldb` parameter
- Cannot access other databases - only operates on tables in the specified database

## Actions

The API supports different actions via the `action` parameter:

### Table Operations
- `list_tables` (GET) - List all tables in the database
- `create_table` (POST) - Create a table from SQL statement

### CRUD Operations
- `select` (GET) - Read/select records from a table
- `insert` (POST) - Insert new records into a table
- `update` (PUT) - Update existing records in a table
- `delete` (DELETE) - Delete records from a table
- `upsert` (POST) - Insert or update records (INSERT ... ON DUPLICATE KEY UPDATE)

## Response Format

**Success Response (List Tables):**
```json
{
  "success": true,
  "data": ["table1", "table2", "table3"],
  "count": 3,
  "database": "database_name"
}
```

**Success Response (Create Table):**
```json
{
  "success": true,
  "message": "Table created successfully",
  "table": "table_name",
  "table_exists": true,
  "sql_executed": "CREATE TABLE IF NOT EXISTS `table_name` (...)"
}
```

**Success Response (Select):**
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "John", "email": "john@example.com"},
    {"id": 2, "name": "Jane", "email": "jane@example.com"}
  ],
  "count": 2,
  "table": "users"
}
```

**Success Response (Insert):**
```json
{
  "success": true,
  "message": "Inserted 1 record(s)",
  "inserted_count": 1,
  "inserted_ids": [123],
  "table": "users"
}
```

**Success Response (Update):**
```json
{
  "success": true,
  "message": "Updated 2 record(s)",
  "affected_rows": 2,
  "table": "users"
}
```

**Success Response (Delete):**
```json
{
  "success": true,
  "message": "Deleted 1 record(s)",
  "affected_rows": 1,
  "table": "users"
}
```

**Success Response (Upsert):**
```json
{
  "success": true,
  "message": "Upserted 1 record(s)",
  "upserted_count": 1,
  "upserted_ids": [123],
  "table": "users"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Technical error details (if available)"
}
```

## Quick Start

**List Tables:**
```
GET https://api.techpinoy.net/mysqlapi.php?action=list_tables&sqlhost=YOUR_HOST&sqlun=YOUR_USERNAME&sqlpw=YOUR_PASSWORD&sqldb=YOUR_DATABASE
```

**Create Table:**
```
POST https://api.techpinoy.net/mysqlapi.php?action=create_table&sqlhost=YOUR_HOST&sqlun=YOUR_USERNAME&sqlpw=YOUR_PASSWORD&sqldb=YOUR_DATABASE
Content-Type: application/json

{
  "sql": "CREATE TABLE IF NOT EXISTS `users` (`id` int(11) NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
}
```

**Example List Tables Response:**
```json
{
  "success": true,
  "data": ["users", "products", "orders"],
  "count": 3,
  "database": "mydatabase"
}
```

**Example Create Table Response:**
```json
{
  "success": true,
  "message": "Table created successfully",
  "table": "users",
  "table_exists": true,
  "sql_executed": "CREATE TABLE IF NOT EXISTS `users` (...)"
}
```

## Usage Examples

### Using cURL

**List Tables:**
```bash
curl "https://api.techpinoy.net/mysqlapi.php?action=list_tables&sqlhost=localhost&sqlun=username&sqlpw=password&sqldb=database_name"
```

**Create Table:**
```bash
curl -X POST "https://api.techpinoy.net/mysqlapi.php?action=create_table&sqlhost=localhost&sqlun=username&sqlpw=password&sqldb=database_name" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "CREATE TABLE IF NOT EXISTS `test_table` (`id` int(11) NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
  }'
```

**With Custom Port:**
```bash
curl "https://api.techpinoy.net/mysqlapi.php?action=list_tables&sqlhost=localhost&sqlport=3307&sqlun=username&sqlpw=password&sqldb=database_name"
```

**Example with Real Database:**
```bash
curl "https://api.techpinoy.net/mysqlapi.php?action=list_tables&sqlhost=your-mysql-host&sqlun=your-username&sqlpw=your-password&sqldb=your-database"
```

### Using JavaScript (Fetch API)

**List Tables:**
```javascript
// Database credentials
const dbConfig = {
  sqlhost: 'your-mysql-host',
  sqlun: 'your-username',
  sqlpw: 'your-password',
  sqldb: 'your-database'
};

// Build query string
const params = new URLSearchParams({
  ...dbConfig,
  action: 'list_tables'
});

// List tables
fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log(`Found ${data.count} tables in ${data.database}:`);
      data.data.forEach(table => console.log(`- ${table}`));
    } else {
      console.error('Error:', data.message);
    }
  })
  .catch(error => console.error('Request failed:', error));
```

**Create Table:**
```javascript
// Database credentials
const dbConfig = {
  sqlhost: 'your-mysql-host',
  sqlun: 'your-username',
  sqlpw: 'your-password',
  sqldb: 'your-database'
};

// Build query string for database params
const params = new URLSearchParams({
  ...dbConfig,
  action: 'create_table'
});

// SQL CREATE TABLE statement
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`name\` varchar(255) NOT NULL,
    \`email\` varchar(255) NOT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// Create table
fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sql: createTableSQL
  })
})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log(`Table "${data.table}" created successfully!`);
    } else {
      console.error('Error:', data.message);
    }
  })
  .catch(error => console.error('Request failed:', error));
```

**Using async/await:**
```javascript
// List tables
async function listTables(host, username, password, database) {
  try {
    const params = new URLSearchParams({
      action: 'list_tables',
      sqlhost: host,
      sqlun: username,
      sqlpw: password,
      sqldb: database
    });
    
    const response = await fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of table names
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Failed to list tables:', error);
    throw error;
  }
}

// Create table
async function createTable(host, username, password, database, sql) {
  try {
    const params = new URLSearchParams({
      action: 'create_table',
      sqlhost: host,
      sqlun: username,
      sqlpw: password,
      sqldb: database
    });
    
    const response = await fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data; // Table creation result
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Failed to create table:', error);
    throw error;
  }
}

// Usage
listTables('your-mysql-host', 'username', 'password', 'database_name')
  .then(tables => console.log('Tables:', tables))
  .catch(error => console.error('Error:', error));

// Create table example
const sql = 'CREATE TABLE IF NOT EXISTS `products` (`id` int(11) NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;';
createTable('your-mysql-host', 'username', 'password', 'database_name', sql)
  .then(result => console.log('Table created:', result.table))
  .catch(error => console.error('Error:', error));
```

### Using PHP

**List Tables:**
```php
<?php
// Database credentials
$params = [
    'action' => 'list_tables',
    'sqlhost' => 'your-mysql-host',
    'sqlun' => 'your-username',
    'sqlpw' => 'your-password',
    'sqldb' => 'your-database'
];

// Build query string
$queryString = http_build_query($params);

// Make request
$url = 'https://api.techpinoy.net/mysqlapi.php?' . $queryString;
$response = file_get_contents($url);
$data = json_decode($response, true);

if ($data['success']) {
    echo "Found {$data['count']} tables in {$data['database']}:\n";
    foreach ($data['data'] as $table) {
        echo "- $table\n";
    }
} else {
    echo "Error: {$data['message']}\n";
}
?>
```

**Create Table:**
```php
<?php
// Database credentials
$params = [
    'action' => 'create_table',
    'sqlhost' => 'your-mysql-host',
    'sqlun' => 'your-username',
    'sqlpw' => 'your-password',
    'sqldb' => 'your-database'
];

// SQL CREATE TABLE statement
$sql = "CREATE TABLE IF NOT EXISTS `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

// Build query string
$queryString = http_build_query($params);

// Prepare POST data
$postData = json_encode(['sql' => $sql]);

// Make request
$url = 'https://api.techpinoy.net/mysqlapi.php?' . $queryString;
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $postData
    ]
]);

$response = file_get_contents($url, false, $context);
$data = json_decode($response, true);

if ($data['success']) {
    echo "Table '{$data['table']}' created successfully!\n";
} else {
    echo "Error: {$data['message']}\n";
}
?>
```

**Using cURL in PHP:**
```php
<?php
// List tables
function listTables($host, $username, $password, $database) {
    $url = 'https://api.techpinoy.net/mysqlapi.php';
    $params = [
        'action' => 'list_tables',
        'sqlhost' => $host,
        'sqlun' => $username,
        'sqlpw' => $password,
        'sqldb' => $database
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return ['success' => false, 'message' => 'Request failed'];
}

// Create table
function createTable($host, $username, $password, $database, $sql) {
    $url = 'https://api.techpinoy.net/mysqlapi.php';
    $params = [
        'action' => 'create_table',
        'sqlhost' => $host,
        'sqlun' => $username,
        'sqlpw' => $password,
        'sqldb' => $database
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['sql' => $sql]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return ['success' => false, 'message' => 'Request failed'];
}

// Usage - List tables
$result = listTables('your-mysql-host', 'username', 'password', 'database_name');
if ($result['success']) {
    print_r($result['data']);
}

// Usage - Create table
$sql = "CREATE TABLE IF NOT EXISTS `products` (`id` int(11) NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
$result = createTable('your-mysql-host', 'username', 'password', 'database_name', $sql);
if ($result['success']) {
    echo "Table '{$result['table']}' created successfully!\n";
}
?>
```

### Using Python

**List Tables:**
```python
import requests

# Database credentials
params = {
    'action': 'list_tables',
    'sqlhost': 'your-mysql-host',
    'sqlun': 'your-username',
    'sqlpw': 'your-password',
    'sqldb': 'your-database'
}

# List tables
response = requests.get('https://api.techpinoy.net/mysqlapi.php', params=params)
data = response.json()

if data['success']:
    print(f"Found {data['count']} tables in {data['database']}:")
    for table in data['data']:
        print(f"- {table}")
else:
    print(f"Error: {data['message']}")
```

**Create Table:**
```python
import requests

# Database credentials
params = {
    'action': 'create_table',
    'sqlhost': 'your-mysql-host',
    'sqlun': 'your-username',
    'sqlpw': 'your-password',
    'sqldb': 'your-database'
}

# SQL CREATE TABLE statement
sql = """
CREATE TABLE IF NOT EXISTS `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `email` varchar(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

# Create table
response = requests.post(
    'https://api.techpinoy.net/mysqlapi.php',
    params=params,
    json={'sql': sql}
)
data = response.json()

if data['success']:
    print(f"Table '{data['table']}' created successfully!")
else:
    print(f"Error: {data['message']}")
```

**Using functions:**
```python
import requests

def list_tables(host, username, password, database):
    """
    List all tables from a MySQL database using the API.
    
    Args:
        host: MySQL hostname
        username: MySQL username
        password: MySQL password
        database: Database name
        
    Returns:
        List of table names or None if error
    """
    url = 'https://api.techpinoy.net/mysqlapi.php'
    params = {
        'action': 'list_tables',
        'sqlhost': host,
        'sqlun': username,
        'sqlpw': password,
        'sqldb': database
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data['success']:
            return data['data']
        else:
            print(f"Error: {data['message']}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def create_table(host, username, password, database, sql):
    """
    Create a table in a MySQL database using the API.
    
    Args:
        host: MySQL hostname
        username: MySQL username
        password: MySQL password
        database: Database name
        sql: CREATE TABLE SQL statement
        
    Returns:
        Dictionary with result or None if error
    """
    url = 'https://api.techpinoy.net/mysqlapi.php'
    params = {
        'action': 'create_table',
        'sqlhost': host,
        'sqlun': username,
        'sqlpw': password,
        'sqldb': database
    }
    
    try:
        response = requests.post(url, params=params, json={'sql': sql})
        response.raise_for_status()
        data = response.json()
        
        if data['success']:
            return data
        else:
            print(f"Error: {data['message']}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

# Usage - List tables
tables = list_tables('your-mysql-host', 'username', 'password', 'database_name')
if tables:
    print(f"Found {len(tables)} tables:")
    for table in tables:
        print(f"  - {table}")

# Usage - Create table
sql = "CREATE TABLE IF NOT EXISTS `products` (`id` int(11) NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
result = create_table('your-mysql-host', 'username', 'password', 'database_name', sql)
if result:
    print(f"Table '{result['table']}' created successfully!")
```

## IP/Domain Whitelist

The API uses IP and domain whitelisting for access control. Only whitelisted IPs or domains can access the API.

### Configuration File

The whitelist is configured in `whitelistip.cnf` file located in the same directory as `mysqlapi.php`.

**File Format:**
- One entry per line
- Supports wildcards (`*`) for IP addresses and domains
- Lines starting with `#` or `;` are treated as comments
- Empty lines are ignored

**Example `whitelistip.cnf`:**
```
# Exact IP addresses
192.168.1.100
10.0.0.5

# IP ranges with wildcards
192.168.1.*
10.0.0.*
172.16.*.*

# Exact domains
example.com
api.example.com

# Domain wildcards
*.example.com
*.techpinoy.net
example.*
```

### Whitelist Behavior

- **Empty whitelist**: If `whitelistip.cnf` doesn't exist or is empty, all IPs are allowed (backward compatibility)
- **IP matching**: Supports exact IPs and wildcard patterns (e.g., `192.168.1.*`)
- **Domain matching**: Supports exact domains and wildcard patterns (e.g., `*.example.com`)
- **Reverse DNS**: The API performs reverse DNS lookup to check domain names
- **Proxy support**: Correctly handles IPs from proxies, load balancers, and Cloudflare

### Access Denied Response

If access is denied, the API returns:
```json
{
  "success": false,
  "message": "Access denied. Your IP address or domain is not whitelisted.",
  "client_ip": "203.0.113.50",
  "client_hostname": "N/A"
}
```

HTTP Status Code: `403 Forbidden`

### Testing Whitelist

You can test the whitelist functionality using the provided test scripts:

```bash
# Test whitelist pattern matching
php test_whitelist.php

# Test API access control
php test_api_access.php
```

## Security Notes

⚠️ **Important**: This API has security restrictions to prevent unauthorized operations:

1. **Database Locked** - The API can only access the database specified in the `sqldb` parameter. It cannot access other databases.
2. **Table Creation Only** - POST method only allows `CREATE TABLE` statements. All other SQL operations are blocked.
3. **SQL Validation** - The API validates that only safe CREATE TABLE statements are executed:
   - Blocks `DROP TABLE`, `DROP DATABASE`, `ALTER TABLE`
   - Blocks `USE database` (database switching)
   - Blocks `INSERT`, `UPDATE`, `DELETE`, `SELECT` operations
   - Blocks `TRUNCATE` operations
   - Prevents cross-database table creation (`database.table` format)
4. **No Data Access** - The API does not provide access to table data or allow data modifications.
5. **HTTPS Recommended** - Use HTTPS in production to protect credentials in transit.
6. **Credential Security** - Never expose credentials in client-side code. Use server-side proxies when possible.

## Error Handling

All errors return JSON responses with:
- `success`: false
- `message`: Human-readable error message
- `error`: Technical error details (if available)

HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (missing/invalid parameters, invalid SQL)
- `403`: Forbidden (IP/domain not whitelisted)
- `405`: Method Not Allowed (unsupported HTTP method)
- `500`: Internal Server Error

## Requirements

- PHP 7.0+
- PDO MySQL extension
- MySQL/MariaDB server

## Parameter Requirements

**All database credentials must be provided with each request.** There are no default configurations, environment variables, or config files. This ensures the API is completely standalone and can work with any MySQL database.

Required parameters for every request:
- `sqlhost` - MySQL hostname
- `sqlun` - MySQL username  
- `sqlpw` - MySQL password
- `sqldb` - MySQL database name

## Limitations

- **Single Database**: Can only access the database specified in `sqldb`
- **Table Name Restrictions**: Table names must be alphanumeric with underscores only
- **WHERE Required**: Update and Delete operations require WHERE conditions
- **No Raw SQL in CRUD**: CRUD operations use structured parameters, not raw SQL
- **No ALTER/DROP Tables**: Cannot modify or delete table structures (only CREATE TABLE)
- **No JOINs**: Select operations work on single tables only
- **No Transactions**: Each operation is executed independently

## Live API Endpoint

**Production URL:** `https://api.techpinoy.net/mysqlapi.php`

All examples in this documentation use the production endpoint. Simply replace the placeholder credentials with your actual MySQL database credentials.

## Testing the API

You can test the API using any HTTP client. Here are quick tests with cURL:

**Test List Tables:**
```bash
# Replace with your actual database credentials
curl "https://api.techpinoy.net/mysqlapi.php?action=list_tables&sqlhost=your-host&sqlun=your-user&sqlpw=your-pass&sqldb=your-db"
```

**Test Create Table:**
```bash
# Replace with your actual database credentials
curl -X POST "https://api.techpinoy.net/mysqlapi.php?action=create_table&sqlhost=your-host&sqlun=your-user&sqlpw=your-pass&sqldb=your-db" \
  -H "Content-Type: application/json" \
  -d '{"sql": "CREATE TABLE IF NOT EXISTS `test_table` (`id` int(11) NOT NULL AUTO_INCREMENT, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"}'
```

If successful, you'll receive a JSON response with the list of tables or table creation confirmation.

## Table Creation Examples

**Example: Create a simple table**
```sql
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Example: Create table with indexes**
```sql
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Note:** Always use `CREATE TABLE IF NOT EXISTS` to avoid errors if the table already exists.

## CRUD Operations

### Select (Read) - GET

Retrieve records from a table with optional filtering, sorting, and pagination.

**Endpoint:**
```
GET /mysqlapi.php?action=select&table=TABLE_NAME&sqlhost=...&sqlun=...&sqlpw=...&sqldb=...
```

**Parameters:**
- `table` (required) - Table name
- `where` (optional) - WHERE conditions as JSON object or query string
- `fields` (optional) - Comma-separated field names or `*` (default: `*`)
- `orderBy` (optional) - Sort order as JSON object `{"field": "ASC|DESC"}`
- `limit` (optional) - Maximum number of records to return
- `offset` (optional) - Number of records to skip (default: 0)

**Example:**
```bash
# Get all records
curl "https://api.techpinoy.net/mysqlapi.php?action=select&table=users&sqlhost=...&sqlun=...&sqlpw=...&sqldb=..."

# Get with WHERE condition
curl "https://api.techpinoy.net/mysqlapi.php?action=select&table=users&where=%7B%22status%22%3A%22active%22%7D&sqlhost=..."

# Get with limit and order
curl "https://api.techpinoy.net/mysqlapi.php?action=select&table=users&limit=10&orderBy=%7B%22id%22%3A%22DESC%22%7D&sqlhost=..."
```

**JavaScript Example:**
```javascript
// Select all records
const params = new URLSearchParams({
  action: 'select',
  table: 'users',
  sqlhost: '...',
  sqlun: '...',
  sqlpw: '...',
  sqldb: '...'
});

fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`)
  .then(res => res.json())
  .then(data => console.log(data.data));

// Select with WHERE condition
const whereCondition = JSON.stringify({ status: 'active' });
params.set('where', whereCondition);
fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`)
  .then(res => res.json())
  .then(data => console.log(data.data));
```

### Insert - POST

Insert new records into a table.

**Endpoint:**
```
POST /mysqlapi.php?action=insert&table=TABLE_NAME&sqlhost=...&sqlun=...&sqlpw=...&sqldb=...
```

**Request Body:**
```json
{
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active"
  }
}
```

**Multiple Records:**
```json
{
  "data": [
    {"name": "John Doe", "email": "john@example.com"},
    {"name": "Jane Smith", "email": "jane@example.com"}
  ]
}
```

**Example:**
```bash
curl -X POST "https://api.techpinoy.net/mysqlapi.php?action=insert&table=users&sqlhost=...&sqlun=...&sqlpw=...&sqldb=..." \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

**JavaScript Example:**
```javascript
const params = new URLSearchParams({
  action: 'insert',
  table: 'users',
  sqlhost: '...',
  sqlun: '...',
  sqlpw: '...',
  sqldb: '...'
});

fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  })
})
  .then(res => res.json())
  .then(data => console.log('Inserted ID:', data.inserted_ids[0]));
```

### Update - PUT

Update existing records in a table. **Requires WHERE condition for safety.**

**Endpoint:**
```
PUT /mysqlapi.php?action=update&table=TABLE_NAME&sqlhost=...&sqlun=...&sqlpw=...&sqldb=...
```

**Request Body:**
```json
{
  "data": {
    "name": "John Updated",
    "email": "john.updated@example.com"
  },
  "where": {
    "id": 1
  }
}
```

**Example:**
```bash
curl -X PUT "https://api.techpinoy.net/mysqlapi.php?action=update&table=users&sqlhost=...&sqlun=...&sqlpw=...&sqldb=..." \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"status": "inactive"},
    "where": {"id": 1}
  }'
```

**JavaScript Example:**
```javascript
const params = new URLSearchParams({
  action: 'update',
  table: 'users',
  sqlhost: '...',
  sqlun: '...',
  sqlpw: '...',
  sqldb: '...'
});

fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: { status: 'inactive' },
    where: { id: 1 }
  })
})
  .then(res => res.json())
  .then(data => console.log('Updated rows:', data.affected_rows));
```

### Delete - DELETE

Delete records from a table. **Requires WHERE condition for safety.**

**Endpoint:**
```
DELETE /mysqlapi.php?action=delete&table=TABLE_NAME&sqlhost=...&sqlun=...&sqlpw=...&sqldb=...
```

**Request Body:**
```json
{
  "where": {
    "id": 1
  }
}
```

**Example:**
```bash
curl -X DELETE "https://api.techpinoy.net/mysqlapi.php?action=delete&table=users&sqlhost=...&sqlun=...&sqlpw=...&sqldb=..." \
  -H "Content-Type: application/json" \
  -d '{
    "where": {"id": 1}
  }'
```

**JavaScript Example:**
```javascript
const params = new URLSearchParams({
  action: 'delete',
  table: 'users',
  sqlhost: '...',
  sqlun: '...',
  sqlpw: '...',
  sqldb: '...'
});

fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    where: { id: 1 }
  })
})
  .then(res => res.json())
  .then(data => console.log('Deleted rows:', data.affected_rows));
```

### Upsert - POST

Insert or update records. If a record with the same unique key exists, it will be updated; otherwise, it will be inserted.

**Endpoint:**
```
POST /mysqlapi.php?action=upsert&table=TABLE_NAME&sqlhost=...&sqlun=...&sqlpw=...&sqldb=...
```

**Request Body:**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Example:**
```bash
curl -X POST "https://api.techpinoy.net/mysqlapi.php?action=upsert&table=users&sqlhost=...&sqlun=...&sqlpw=...&sqldb=..." \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "id": 1,
      "name": "John Updated",
      "email": "john@example.com"
    }
  }'
```

**JavaScript Example:**
```javascript
const params = new URLSearchParams({
  action: 'upsert',
  table: 'users',
  sqlhost: '...',
  sqlun: '...',
  sqlpw: '...',
  sqldb: '...'
});

fetch(`https://api.techpinoy.net/mysqlapi.php?${params}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      id: 1,
      name: 'John Updated',
      email: 'john@example.com'
    }
  })
})
  .then(res => res.json())
  .then(data => console.log('Upserted:', data.upserted_count));
```

## CRUD Security Notes

⚠️ **Important Security Features:**

1. **Table Name Validation** - Only alphanumeric characters and underscores are allowed in table names
2. **Field Name Validation** - Field names are validated to prevent SQL injection
3. **Prepared Statements** - All queries use PDO prepared statements for security
4. **WHERE Required** - Update and Delete operations require WHERE conditions to prevent accidental mass updates/deletes
5. **Database Locked** - All operations are limited to the database specified in `sqldb` parameter
6. **No Raw SQL** - CRUD operations use structured parameters, not raw SQL strings
