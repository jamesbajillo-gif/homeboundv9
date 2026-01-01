/**
 * Import Data Component - Import spiels and configurations from SQL file
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { importFromSQL, importFromSQLFile } from '@/lib/importScript';
import { MySQLConfig } from '@/lib/mysqlApi';
import { DEFAULT_MYSQL_CONFIG } from '@/lib/mysqlTableApi';
import { migrateLocalStorageToAPI } from '@/lib/migration';

export const ImportData = () => {
  const [loading, setLoading] = useState(false);
  const [sqlContent, setSqlContent] = useState('');
  const [config, setConfig] = useState<MySQLConfig>(DEFAULT_MYSQL_CONFIG);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: {
      scripts: number;
      listIdConfigs: number;
      formFields: number;
      zapierSettings: number;
    };
    errors: string[];
  } | null>(null);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migrated: number;
    errors: string[];
  } | null>(null);

  // Load config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mysql_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_MYSQL_CONFIG, ...parsed });
      }
    } catch (error) {
      console.error('Error loading MySQL config:', error);
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSqlContent(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!sqlContent.trim()) {
      toast.error('Please provide SQL content or upload a file');
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const result = await importFromSQL(sqlContent, config);
      setImportResult(result);

      if (result.success) {
        toast.success(
          `Import successful! Imported ${result.imported.scripts} scripts, ${result.imported.listIdConfigs} list configs, ${result.imported.formFields} form fields, ${result.imported.zapierSettings} zapier settings.`
        );
      } else {
        toast.error(`Import completed with ${result.errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
      setImportResult({
        success: false,
        imported: {
          scripts: 0,
          listIdConfigs: 0,
          formFields: 0,
          zapierSettings: 0,
        },
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromFile = async () => {
    setLoading(true);
    setImportResult(null);

    try {
      // Import from local SQL file
      const result = await importFromSQLFile('/dynamicscript.sql', config);
      setImportResult(result);

      if (result.success) {
        toast.success(
          `Import successful! Imported ${result.imported.scripts} scripts, ${result.imported.listIdConfigs} list configs, ${result.imported.formFields} form fields, ${result.imported.zapierSettings} zapier settings.`
        );
      } else {
        toast.error(`Import completed with ${result.errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
      setImportResult({
        success: false,
        imported: {
          scripts: 0,
          listIdConfigs: 0,
          formFields: 0,
          zapierSettings: 0,
        },
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    setLoading(true);
    setMigrationResult(null);

    try {
      const result = await migrateLocalStorageToAPI(config);
      setMigrationResult(result);

      if (result.success) {
        toast.success(`Migration successful! Migrated ${result.migrated} settings.`);
      } else {
        toast.error(`Migration completed with ${result.errors.length} errors`);
      }
    } catch (error: any) {
      toast.error(`Migration failed: ${error.message}`);
      setMigrationResult({
        success: false,
        migrated: 0,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Data from SQL File</CardTitle>
          <CardDescription>
            Import all spiels, configurations, and form fields from a SQL file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sql-file">Upload SQL File</Label>
            <Input
              id="sql-file"
              type="file"
              accept=".sql"
              onChange={handleFileUpload}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sql-content">Or Paste SQL Content</Label>
            <Textarea
              id="sql-content"
              value={sqlContent}
              onChange={(e) => setSqlContent(e.target.value)}
              placeholder="Paste SQL INSERT statements here..."
              rows={10}
              disabled={loading}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={loading || !sqlContent.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import from Content
                </>
              )}
            </Button>
            <Button onClick={handleImportFromFile} disabled={loading} variant="outline">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Import from File
                </>
              )}
            </Button>
          </div>

          {importResult && (
            <Alert variant={importResult.success ? 'default' : 'destructive'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-semibold">
                      {importResult.success ? 'Import Successful' : 'Import Completed with Errors'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Scripts: {importResult.imported.scripts}</div>
                    <div>List ID Configs: {importResult.imported.listIdConfigs}</div>
                    <div>Form Fields: {importResult.imported.formFields}</div>
                    <div>Zapier Settings: {importResult.imported.zapierSettings}</div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold">Errors:</div>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migrate localStorage to API</CardTitle>
          <CardDescription>
            Move all localStorage data (settings, preferences, drafts) to the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleMigrate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Migrate localStorage to API
              </>
            )}
          </Button>

          {migrationResult && (
            <Alert variant={migrationResult.success ? 'default' : 'destructive'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {migrationResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-semibold">
                      {migrationResult.success
                        ? 'Migration Successful'
                        : 'Migration Completed with Errors'}
                    </span>
                  </div>
                  <div className="text-sm">
                    Migrated {migrationResult.migrated} settings
                  </div>
                  {migrationResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold">Errors:</div>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {migrationResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

