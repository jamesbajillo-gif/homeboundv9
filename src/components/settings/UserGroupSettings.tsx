import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface UserGroup {
  id: number;
  user_identifier: string;
  group_type: "inbound" | "outbound";
}

export const UserGroupSettings = () => {
  const [users, setUsers] = useState<UserGroup[]>([]);
  const [newUserIdentifier, setNewUserIdentifier] = useState("");
  const [newGroupType, setNewGroupType] = useState<"inbound" | "outbound">("inbound");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const accessLevel = localStorage.getItem('settings_access_level') || 'kainkatae';

  useEffect(() => {
    fetchUserGroups();
    // Load disabled state from localStorage, default to disabled (true)
    const savedDisabledState = localStorage.getItem('spiel_groups_disabled');
    if (savedDisabledState === null) {
      // First time - default to disabled
      setIsDisabled(true);
      localStorage.setItem('spiel_groups_disabled', 'true');
    } else {
      setIsDisabled(savedDisabledState === 'true');
    }
  }, []);

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const data = await mysqlApi.getAll<UserGroup>("homebound_user_groups");
      
      // Sort by id descending (newest first)
      const sortedData = data.sort((a, b) => b.id - a.id);
      setUsers(sortedData);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      toast.error("Failed to load user groups");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserIdentifier.trim()) {
      toast.error("User identifier is required");
      return;
    }

    try {
      setAdding(true);

      await mysqlApi.create("homebound_user_groups", {
        user_identifier: newUserIdentifier.trim(),
        group_type: newGroupType,
      });

      toast.success("User added successfully!");
      setNewUserIdentifier("");
      setNewGroupType("inbound");
      fetchUserGroups();
    } catch (error: any) {
      console.error("Error adding user:", error);
      if (error.message?.includes('Duplicate')) {
        toast.error("User identifier already exists");
      } else {
        toast.error("Failed to add user");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (id: number, userIdentifier: string) => {
    try {
      await mysqlApi.deleteById("homebound_user_groups", id);

      toast.success(`User "${userIdentifier}" removed successfully!`);
      fetchUserGroups();
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Failed to remove user");
    }
  };

  if (loading && users.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">User Group Settings</h2>
      <p className="text-muted-foreground mb-6">
        Configure group identifiers to match with VICI dialer data.
      </p>

      {accessLevel !== 'operation' && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Enter the VICI user ID exactly as it appears in the URL parameter. 
            For example, if your VICI URL contains <code className="bg-background px-1 py-0.5 rounded text-xs">user=804</code>, 
            enter <strong>804</strong> as the user identifier (not the word "user").
          </AlertDescription>
        </Alert>
      )}

      {/* Disable Groups Checkbox */}
      <div className="flex items-start space-x-3 mb-6 p-4 rounded-lg border bg-card">
        <Checkbox
          id="disable-groups"
          checked={isDisabled}
          onCheckedChange={(checked) => {
            const newValue = checked as boolean;
            setIsDisabled(newValue);
            localStorage.setItem('spiel_groups_disabled', String(newValue));
            toast.success(newValue ? 'Spiel group assignments disabled' : 'Spiel group assignments enabled');
          }}
        />
        <div className="space-y-1">
          <Label
            htmlFor="disable-groups"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Disable Spiel Group Assignments
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, all user group assignments will be temporarily disabled. This prevents the system from applying group-specific scripts and configurations.
          </p>
        </div>
      </div>

      {/* Add New User Form */}
      <Card className="p-4 mb-6 bg-muted/50">
        <h3 className="text-sm font-semibold mb-4">Add New User</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="newUserIdentifier">
              User ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="newUserIdentifier"
              placeholder="e.g., 804, 6006..."
              value={newUserIdentifier}
              onChange={(e) => setNewUserIdentifier(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Group Type <span className="text-destructive">*</span></Label>
            <RadioGroup value={newGroupType} onValueChange={(value) => setNewGroupType(value as "inbound" | "outbound")}>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inbound" id="inbound" />
                  <Label htmlFor="inbound" className="font-normal cursor-pointer">Inbound</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outbound" id="outbound" />
                  <Label htmlFor="outbound" className="font-normal cursor-pointer">Outbound</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <Button 
          onClick={handleAddUser} 
          disabled={adding || !newUserIdentifier.trim() || isDisabled}
          className="gap-2"
          size="sm"
        >
          {adding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add User
            </>
          )}
        </Button>
      </Card>

      {/* Users List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Configured Users ({users.length})</h3>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No users configured yet. Add your first user above.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-sm">{user.user_identifier}</p>
                    <Badge 
                      variant={user.group_type === "inbound" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {user.group_type === "inbound" ? "Inbound" : "Outbound"}
                    </Badge>
                  </div>
                   <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveUser(user.id, user.user_identifier)}
                    className="gap-1"
                    disabled={isDisabled}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
