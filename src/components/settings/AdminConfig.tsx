import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2, Shield, AlertCircle, Info, Users } from 'lucide-react';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useManagerUsers } from '@/hooks/useManagerUsers';
import { toast } from 'sonner';

const AdminUserList = () => {
  const { adminUsers, isLoading, addAdmin, removeAdmin, isAdding, isRemoving } = useAdminUsers();
  const [newUserId, setNewUserId] = useState('');

  const handleAdd = () => {
    const trimmedUserId = newUserId.trim();
    if (!trimmedUserId) {
      toast.error('User ID cannot be empty');
      return;
    }

    // Validate user ID format (alphanumeric, typically 3 digits)
    if (!/^[a-zA-Z0-9]+$/.test(trimmedUserId)) {
      toast.error('User ID must be alphanumeric');
      return;
    }

    addAdmin(trimmedUserId);
    setNewUserId('');
  };

  const handleRemove = (userId: string) => {
    if (userId === '000') {
      toast.error('Cannot remove the default admin user (000)');
      return;
    }

    if (window.confirm(`Remove admin access for user ${userId}?`)) {
      removeAdmin(userId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading admin configuration...</span>
        </CardContent>
      </Card>
    );
  }

  // Always include the default admin (000) in the display
  const allAdminUsers = ['000', ...adminUsers.filter(id => id !== '000')];

  return (
    <div className="space-y-4">

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            Manage users with admin privileges. Admins can edit and approve scripts for all campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Admin Form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-user-id">Add Admin User ID</Label>
              <Input
                id="new-user-id"
                placeholder="Enter user ID (e.g., 001, 021)"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAdding}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdd}
                disabled={isAdding || !newUserId.trim()}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Admin Users List */}
          {allAdminUsers.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAdminUsers.map((userId) => (
                    <TableRow key={userId}>
                      <TableCell className="font-mono font-medium">{userId}</TableCell>
                      <TableCell>
                        {userId === '000' ? (
                          <Badge variant="default" className="bg-blue-500">
                            Default Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {userId === '000' ? (
                          <span className="text-sm text-muted-foreground">Cannot remove</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(userId)}
                            disabled={isRemoving}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Admin Users</AlertTitle>
              <AlertDescription>
                Add user IDs to grant admin access. The default admin (000) is always available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Admin Permissions</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Edit and modify scripts/spiels for all campaigns</li>
            <li>Approve user-submitted scripts</li>
            <li>Add new scripts and alternatives</li>
            <li>Add new tabs/scripts</li>
            <li>Access all settings pages</li>
            <li>Manage campaign configurations</li>
            <li>Manage admin and manager users</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

const ManagerUserList = () => {
  const { managerUsers, isLoading, addManager, removeManager, isAdding, isRemoving } = useManagerUsers();
  const [newUserId, setNewUserId] = useState('');

  const handleAdd = () => {
    const trimmedUserId = newUserId.trim();
    if (!trimmedUserId) {
      toast.error('User ID cannot be empty');
      return;
    }

    // Validate user ID format (alphanumeric, typically 3 digits)
    if (!/^[a-zA-Z0-9]+$/.test(trimmedUserId)) {
      toast.error('User ID must be alphanumeric');
      return;
    }

    addManager(trimmedUserId);
    setNewUserId('');
  };

  const handleRemove = (userId: string) => {
    if (window.confirm(`Remove manager access for user ${userId}?`)) {
      removeManager(userId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading manager configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manager Users</CardTitle>
          <CardDescription>
            Manage users with manager privileges. Managers can edit scripts, approve submissions, and add new content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Manager Form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-manager-id">Add Manager User ID</Label>
              <Input
                id="new-manager-id"
                placeholder="Enter user ID (e.g., 001, 021)"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAdding}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdd}
                disabled={isAdding || !newUserId.trim()}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manager
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Manager Users List */}
          {managerUsers.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerUsers.map((userId) => (
                    <TableRow key={userId}>
                      <TableCell className="font-mono font-medium">{userId}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-purple-500">
                          Manager
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(userId)}
                          disabled={isRemoving}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Manager Users</AlertTitle>
              <AlertDescription>
                Add user IDs to grant manager access. Managers can edit scripts, approve submissions, and add new content.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Manager Permissions</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Edit and modify scripts/spiels for all campaigns</li>
            <li>Approve user-submitted scripts</li>
            <li>Add new scripts and alternatives</li>
            <li>Add new tabs/scripts</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export const AdminConfig = () => {
  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>User Access Configuration</AlertTitle>
        <AlertDescription>
          Configure admin and manager users with different permission levels. Admins have full access including user management, while managers can edit scripts, approve submissions, and add new content.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admins">
            <Shield className="h-4 w-4 mr-2" />
            Admin Users
          </TabsTrigger>
          <TabsTrigger value="managers">
            <Users className="h-4 w-4 mr-2" />
            Manager Users
          </TabsTrigger>
        </TabsList>
        <TabsContent value="admins" className="mt-6">
          <AdminUserList />
        </TabsContent>
        <TabsContent value="managers" className="mt-6">
          <ManagerUserList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

