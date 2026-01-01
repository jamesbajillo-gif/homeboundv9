import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { mysqlApi } from "@/lib/mysqlApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ListIdConfig {
  list_id: string;
  name: string;
}

interface ListIdConfigurationProps {
  selectedListId: string;
  onSelectListId: (listId: string) => void;
}

export const ListIdConfiguration = ({ selectedListId, onSelectListId }: ListIdConfigurationProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newListId, setNewListId] = useState("");
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();
  const accessLevel = localStorage.getItem('settings_access_level') || 'kainkatae';

  // Fetch unique list IDs (not individual script steps)
  const { data: listConfigs = [], isLoading } = useQuery({
    queryKey: ["list-id-configs"],
    queryFn: async () => {
      const data = await mysqlApi.getAll<{ list_id: string; name: string }>(
        "homebound_list_id_config",
        {
          fields: ["list_id", "name"],
          orderBy: "list_id",
          order: "ASC"
        }
      );
      
      // Get unique list_ids
      const unique = data.reduce((acc, curr) => {
        if (!acc.find(item => item.list_id === curr.list_id)) {
          acc.push(curr);
        }
        return acc;
      }, [] as ListIdConfig[]);
      
      return unique;
    },
  });

  const selectedConfig = listConfigs.find((c) => c.list_id === selectedListId);

  // Create new List ID (creates greeting step as initial entry)
  // Use upsert instead of create to handle duplicate (list_id, step_name) gracefully
  const createMutation = useMutation({
    mutationFn: async () => {
      // Use upsert to handle case where list_id + step_name combination already exists
      await mysqlApi.upsertByFields("homebound_list_id_config", {
        list_id: newListId,
        name: newName,
        step_name: "greeting",
        title: "Opening Greeting",
        content: "",
      });
      
      return { list_id: newListId, name: newName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["list-id-configs"] });
      toast.success("List ID created successfully");
      onSelectListId(data.list_id);
      setIsCreating(false);
      setNewListId("");
      setNewName("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create List ID");
    },
  });

  // Update List ID name
  const updateMutation = useMutation({
    mutationFn: async (newName: string) => {
      await mysqlApi.updateByWhere(
        "homebound_list_id_config",
        { list_id: selectedListId },
        { name: newName }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-id-configs"] });
      toast.success("List ID name updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update List ID");
    },
  });

  // Delete List ID (deletes all script steps for this list_id)
  const deleteMutation = useMutation({
    mutationFn: async (listId: string) => {
      await mysqlApi.deleteByWhere("homebound_list_id_config", { list_id: listId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-id-configs"] });
      toast.success("List ID and all its scripts deleted successfully");
      onSelectListId("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete List ID");
    },
  });

  const handleSave = () => {
    if (!selectedConfig) return;
    updateMutation.mutate(selectedConfig.name);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>List ID Management</CardTitle>
          <CardDescription>
            Configure List IDs and their associated call scripts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Select List ID</Label>
              <Select value={selectedListId} onValueChange={onSelectListId}>
                <SelectTrigger>
                  <SelectValue placeholder={listConfigs.length === 0 ? "No List IDs configured yet" : "Choose a List ID to configure"} />
                </SelectTrigger>
                <SelectContent>
                  {listConfigs.map((config) => (
                    <SelectItem key={config.list_id} value={config.list_id}>
                      {config.list_id} - {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {accessLevel === 'kainkatae' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCreating(true)}
                className="mt-6"
                title="Create new List ID"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isCreating && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Create New List ID</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-list-id">List ID</Label>
                  <Input
                    id="new-list-id"
                    value={newListId}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numeric characters (0-9)
                      const numericValue = value.replace(/[^0-9]/g, '');
                      setNewListId(numericValue);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="new-name">List Description</Label>
                  <Input
                    id="new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., ABC Campaign"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!newListId || !newName || createMutation.isPending}
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setNewListId("");
                      setNewName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedConfig && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedConfig.list_id}</CardTitle>
                    <CardDescription>Configure List ID properties</CardDescription>
                  </div>
                  {accessLevel === 'kainkatae' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Delete List ID">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete List ID?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the List ID "{selectedConfig.list_id}" and all its associated scripts (greeting, qualification, objections, closing steps). This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(selectedConfig.list_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="list-id-value">List ID</Label>
                  <Input
                    id="list-id-value"
                    value={selectedConfig.list_id}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                <div>
                  <Label htmlFor="display-name">List Description</Label>
                  <Input
                    id="display-name"
                    value={selectedConfig.name}
                    onChange={(e) => {
                      const updated = listConfigs.map((c) =>
                        c.list_id === selectedListId ? { ...c, name: e.target.value } : c
                      );
                      queryClient.setQueryData(["list-id-configs"], updated);
                    }}
                    placeholder="Enter list description..."
                  />
                </div>

                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
