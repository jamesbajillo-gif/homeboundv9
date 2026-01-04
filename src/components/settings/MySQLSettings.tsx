import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Database, CheckCircle2, XCircle, AlertCircle, TestTube, Copy, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  MySQLTableApiClient,
  DEFAULT_MYSQL_CONFIG,
  REQUIRED_TABLES,
  generateCreateTableSQL,
  getTableSQLStatements,
  type MySQLConfig,
} from "@/lib/mysqlTableApi";

interface ConnectionStatus {
  success: boolean;
  message: string;
  tables?: string[];
  count?: number;
}

interface TableCheckResult {
  success: boolean;
  allExist: boolean;
  existingTables: string[];
  missingTables: string[];
  message?: string;
}

const STORAGE_KEY = 'tmdebt_mysql_config';

export const MySQLSettings = () => {
  const [config, setConfig] = useState<MySQLConfig>(DEFAULT_MYSQL_CONFIG);
  const [testing, setTesting] = useState(false);
  const [checkingTables, setCheckingTables] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [tableCheckResult, setTableCheckResult] = useState<TableCheckResult | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState<string>('');
  const [creatingTables, setCreatingTables] = useState(false);
  const [createResults, setCreateResults] = useState<{
    success: boolean;
    results: Array<{
      success: boolean;
      message: string;
      table?: string;
      error?: string;
    }>;
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  // Load saved configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_MYSQL_CONFIG, ...parsed });
      }
    } catch (error) {
      console.error('Error loading MySQL config:', error);
    }
  }, []);

  // Save configuration to localStorage
  const saveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast.success('MySQL configuration saved!');
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  // Test database connection
  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);
    setTableCheckResult(null);

    try {
      const result = await MySQLTableApiClient.testConnection(config);
      setConnectionStatus(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to test connection';
      setConnectionStatus({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  // Check if required tables exist
  const handleCheckTables = async () => {
    setCheckingTables(true);
    setTableCheckResult(null);

    try {
      const result = await MySQLTableApiClient.checkTablesExist(config, REQUIRED_TABLES);
      setTableCheckResult(result);

      if (result.success && result.allExist) {
        toast.success(`All required tables exist (${REQUIRED_TABLES.length} tables)`);
      } else if (result.success && !result.allExist) {
        toast.warning(`Missing ${result.missingTables.length} required table(s)`);
      } else {
        toast.error(result.message || 'Failed to check tables');
      }
    } catch (error: any) {
      setTableCheckResult({
        success: false,
        allExist: false,
        existingTables: [],
        missingTables: REQUIRED_TABLES,
        message: error.message || 'Failed to check tables',
      });
      toast.error(error.message || 'Failed to check tables');
    } finally {
      setCheckingTables(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setConfig(DEFAULT_MYSQL_CONFIG);
    setConnectionStatus(null);
    setTableCheckResult(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.info('Configuration reset to defaults');
  };

  // Generate SQL for missing tables
  const handleGenerateCreateSQL = () => {
    if (!tableCheckResult || tableCheckResult.missingTables.length === 0) {
      toast.warning('No missing tables to create');
      return;
    }

    const sql = generateCreateTableSQL(tableCheckResult.missingTables);
    setGeneratedSQL(sql);
    setShowCreateDialog(true);
  };

  // Copy SQL to clipboard
  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(generatedSQL);
      toast.success('SQL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy SQL');
    }
  };

  // Download SQL as file
  const handleDownloadSQL = () => {
    const blob = new Blob([generatedSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `create_missing_tables_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('SQL file downloaded!');
  };

  // Create missing tables directly via API
  const handleCreateMissingTables = async () => {
    if (!tableCheckResult || tableCheckResult.missingTables.length === 0) {
      toast.warning('No missing tables to create');
      return;
    }

    setCreatingTables(true);
    setCreateResults(null);

    try {
      const sqlStatements = getTableSQLStatements(tableCheckResult.missingTables);
      
      if (sqlStatements.length === 0) {
        toast.error('No valid SQL statements found for missing tables');
        setCreatingTables(false);
        return;
      }

      const result = await MySQLTableApiClient.createTables(config, sqlStatements);
      setCreateResults(result);

      if (result.success) {
        toast.success(`Successfully created ${result.succeeded} table(s)!`);
        // Refresh table check
        setTimeout(() => {
          handleCheckTables();
        }, 1000);
      } else {
        if (result.succeeded > 0) {
          toast.warning(`Created ${result.succeeded} table(s), but ${result.failed} failed`);
        } else {
          toast.error(`Failed to create tables. ${result.failed} error(s) occurred`);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tables');
      setCreateResults({
        success: false,
        results: [],
        total: 0,
        succeeded: 0,
        failed: 0,
      });
    } finally {
      setCreatingTables(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">MySQL Database Configuration</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure MySQL database connection settings and verify required tables exist.
          </p>
        </div>

        {/* Database Prefix Info */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Badge variant="outline" className="font-mono text-xs">
            Table Prefix: tmdebt_
          </Badge>
          <span className="text-sm text-muted-foreground">
            All application tables use this prefix (e.g., tmdebt_script, tmdebt_app_settings)
          </span>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Note:</strong> This uses the MySQL Table Listing API to check database connectivity and table existence.
            Credentials are stored locally in your browser and sent to the API for testing.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">Hostname</Label>
            <Input
              id="host"
              value={config.sqlhost}
              onChange={(e) => setConfig({ ...config, sqlhost: e.target.value })}
              placeholder="e.g., 167.86.95.115"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={config.sqlport || 3306}
              onChange={(e) => setConfig({ ...config, sqlport: parseInt(e.target.value) || 3306 })}
              placeholder="3306"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={config.sqlun}
              onChange={(e) => setConfig({ ...config, sqlun: e.target.value })}
              placeholder="MySQL username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={config.sqlpw}
              onChange={(e) => setConfig({ ...config, sqlpw: e.target.value })}
              placeholder="MySQL password"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="database">Database Name</Label>
            <Input
              id="database"
              value={config.sqldb}
              onChange={(e) => setConfig({ ...config, sqldb: e.target.value })}
              placeholder="Database name"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="charset">Charset (Optional)</Label>
            <Input
              id="charset"
              value={config.sqlcharset || 'utf8mb4'}
              onChange={(e) => setConfig({ ...config, sqlcharset: e.target.value })}
              placeholder="utf8mb4"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={saveConfig} variant="default">
            Save Configuration
          </Button>
          <Button
            onClick={handleTestConnection}
            disabled={testing}
            variant="outline"
            className="gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          <Button
            onClick={handleCheckTables}
            disabled={checkingTables || !connectionStatus?.success}
            variant="outline"
            className="gap-2"
          >
            {checkingTables ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Check Required Tables
              </>
            )}
          </Button>
          <Button onClick={handleReset} variant="ghost">
            Reset to Defaults
          </Button>
        </div>

        {/* Connection Status */}
        {connectionStatus && (
          <Alert variant={connectionStatus.success ? "default" : "destructive"}>
            {connectionStatus.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{connectionStatus.message}</p>
                {connectionStatus.success && connectionStatus.tables && (
                  <div className="text-xs text-muted-foreground">
                    <p>Total tables: {connectionStatus.count}</p>
                    {connectionStatus.tables.length > 0 && (
                      <p className="mt-1">
                        Sample tables: {connectionStatus.tables.slice(0, 5).join(', ')}
                        {connectionStatus.tables.length > 5 && '...'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Table Check Results */}
        {tableCheckResult && (
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {tableCheckResult.allExist ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <h3 className="font-semibold">
                  Required Tables Check
                </h3>
              </div>

              {tableCheckResult.success ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Required Tables ({REQUIRED_TABLES.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {REQUIRED_TABLES.map((table) => {
                        const exists = tableCheckResult.existingTables.includes(table);
                        return (
                          <Badge
                            key={table}
                            variant={exists ? "default" : "destructive"}
                            className="gap-1"
                          >
                            {exists ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {table}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {tableCheckResult.missingTables.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium mb-1">
                              Missing {tableCheckResult.missingTables.length} required table(s):
                            </p>
                            <ul className="list-disc list-inside text-sm">
                              {tableCheckResult.missingTables.map((table) => (
                                <li key={table}>{table}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={handleCreateMissingTables}
                              disabled={creatingTables}
                              size="sm"
                              className="gap-2"
                            >
                              {creatingTables ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Create Missing Tables Now
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleGenerateCreateSQL}
                              disabled={creatingTables}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Generate SQL (Manual)
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Create Results */}
                  {createResults && (
                    <Card className="p-4 border-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {createResults.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          )}
                          <h4 className="font-semibold">Table Creation Results</h4>
                        </div>
                        <div className="text-sm space-y-2">
                          <p>
                            <strong>Total:</strong> {createResults.total} table(s) |{' '}
                            <span className="text-green-600">
                              <strong>Succeeded:</strong> {createResults.succeeded}
                            </span>
                            {createResults.failed > 0 && (
                              <>
                                {' '}|{' '}
                                <span className="text-red-600">
                                  <strong>Failed:</strong> {createResults.failed}
                                </span>
                              </>
                            )}
                          </p>
                          {createResults.results.length > 0 && (
                            <div className="space-y-1">
                              {createResults.results.map((result, index) => (
                                <div
                                  key={index}
                                  className={`p-2 rounded text-xs ${
                                    result.success
                                      ? 'bg-green-50 text-green-800'
                                      : 'bg-red-50 text-red-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {result.success ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    <span className="font-medium">
                                      {result.table || `Table ${index + 1}`}:
                                    </span>
                                    <span>{result.message}</span>
                                  </div>
                                  {result.error && (
                                    <div className="mt-1 text-xs opacity-90">
                                      <p className="font-medium">Error Details:</p>
                                      <p className="break-words">{result.error}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}

                  {tableCheckResult.allExist && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        All required tables exist in the database. The application is ready to use.
                      </AlertDescription>
                    </Alert>
                  )}

                  {tableCheckResult.existingTables.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        All Tables in Database ({tableCheckResult.existingTables.length}):
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {tableCheckResult.existingTables.map((table) => (
                          <Badge key={table} variant="outline" className="text-xs">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium">{tableCheckResult.message || 'Failed to check tables'}</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        )}

        {/* Create Tables Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>SQL to Create Missing Tables</DialogTitle>
              <DialogDescription>
                Copy or download the SQL statements below to create the missing tables in your database.
                Execute these statements using your MySQL client (phpMyAdmin, MySQL Workbench, or command line).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  value={generatedSQL}
                  readOnly
                  className="font-mono text-sm min-h-[300px] max-h-[400px] overflow-auto"
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Important:</strong> Execute these SQL statements in your MySQL database using a tool like phpMyAdmin, 
                  MySQL Workbench, or the MySQL command line. Make sure you have the necessary permissions to create tables.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={handleCopySQL} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy SQL
              </Button>
              <Button onClick={handleDownloadSQL} className="gap-2">
                <Download className="h-4 w-4" />
                Download SQL File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};

