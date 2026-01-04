import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  Plus,
  Loader2,
  Info
} from 'lucide-react';
import { useCampaignDiagnostics } from '@/hooks/useCampaignDiagnostics';
import { useCampaign } from '@/contexts/CampaignContext';
import { TABLE_DESCRIPTIONS, TABLE_CATEGORIES, BaseTableName } from '@/lib/campaignSchema';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const CampaignDiagnostics = () => {
  const { campaign } = useCampaign();
  const { diagnostics, isLoading, error, refetch, createMissingTables, isCreatingTables } = useCampaignDiagnostics(campaign);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateTables = async () => {
    try {
      const result = await createMissingTables();
      if (result.success) {
        toast.success('All missing tables created successfully', {
          description: `${result.results.length} table(s) created.`,
        });
      } else {
        const failed = result.results.filter(r => !r.success);
        toast.warning('Some tables failed to create', {
          description: `${failed.length} of ${result.results.length} table(s) failed.`,
        });
      }
      setShowCreateDialog(false);
    } catch (error: any) {
      toast.error('Failed to create tables', {
        description: error.message || 'An error occurred while creating tables.',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Checking campaign diagnostics...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load campaign diagnostics: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!diagnostics) {
    return null;
  }

  const { connectionStatus, tables, missingTables, emptyTables, totalTables, existingTables, totalRecords } = diagnostics;

  // Group tables by category
  const tablesByCategory = tables.reduce((acc, table) => {
    const category = TABLE_CATEGORIES[table.baseTable];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            {connectionStatus === 'connected' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{connectionStatus}</div>
            <p className="text-xs text-muted-foreground">
              Database connection status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tables Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {existingTables} / {totalTables}
            </div>
            <p className="text-xs text-muted-foreground">
              {missingTables.length > 0 && `${missingTables.length} missing`}
              {missingTables.length === 0 && 'All tables exist'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empty Tables</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptyTables.length}</div>
            <p className="text-xs text-muted-foreground">
              Tables with no data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total records across all tables
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage and diagnose campaign tables</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Diagnostics
          </Button>
          {missingTables.length > 0 && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={isCreatingTables}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Missing Tables ({missingTables.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tables by Category */}
      {Object.entries(tablesByCategory).map(([category, categoryTables]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
            <CardDescription>
              {categoryTables.filter(t => t.exists).length} of {categoryTables.length} tables exist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTables.map((table) => (
                  <TableRow key={table.tableName}>
                    <TableCell className="font-mono text-sm">{table.tableName}</TableCell>
                    <TableCell>
                      {table.exists ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Exists
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {table.exists ? (
                        table.recordCount !== null ? (
                          <Badge variant={table.recordCount === 0 ? 'secondary' : 'default'}>
                            {table.recordCount.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {table.error ? (
                              <span className="text-red-500">Error</span>
                            ) : (
                              'Unknown'
                            )}
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TABLE_DESCRIPTIONS[table.baseTable]}
                      {table.error && (
                        <div className="mt-1 text-xs text-red-500">
                          Error: {table.error}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Missing Tables Alert */}
      {missingTables.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Tables Detected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              The following {missingTables.length} table(s) are missing for the <strong>{campaign}</strong> campaign:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-sm">
              {missingTables.map(table => (
                <li key={table}>{table}</li>
              ))}
            </ul>
            <p className="mt-2">
              Click "Create Missing Tables" to automatically create them.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty Tables Info */}
      {emptyTables.length > 0 && missingTables.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Empty Tables</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              The following {emptyTables.length} table(s) exist but contain no data:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-sm">
              {emptyTables.map(table => (
                <li key={table}>{table}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              This is normal for new campaigns. Data will be populated as you use the application.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Create Tables Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Missing Tables</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {missingTables.length} missing table(s) for the <strong>{campaign}</strong> campaign:
              <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-sm">
                {missingTables.map(table => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-medium">
                Are you sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateTables} disabled={isCreatingTables}>
              {isCreatingTables ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Tables'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

