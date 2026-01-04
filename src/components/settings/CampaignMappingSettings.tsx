import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCampaignMappings, CampaignMapping } from "@/hooks/useCampaignMappings";
import { Campaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";

export const CampaignMappingSettings = () => {
  const { mappings, isLoading, addMapping, deleteMapping, isSaving } = useCampaignMappings();
  const [newVariable, setNewVariable] = useState("");
  const [newPrefix, setNewPrefix] = useState<Campaign>("tmdebt");

  const handleAdd = async () => {
    if (!newVariable.trim()) {
      toast.error("Campaign variable cannot be empty");
      return;
    }

    const normalizedVariable = newVariable.trim().toLowerCase();
    
    // Check for duplicates
    if (mappings.some(m => m.campaign_variable.toLowerCase() === normalizedVariable)) {
      toast.error("This campaign variable already exists");
      return;
    }

    try {
      await addMapping({
        campaign_variable: normalizedVariable,
        campaign_prefix: newPrefix,
      });
      setNewVariable("");
      setNewPrefix("tmdebt");
    } catch (error) {
      console.error("Error adding mapping:", error);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      await deleteMapping(index);
    } catch (error) {
      console.error("Error deleting mapping:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Mapping</CardTitle>
          <CardDescription>
            Map campaign variables to campaign prefixes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Mapping</CardTitle>
        <CardDescription>
          Map campaign variables (URL parameters) to campaign prefixes. 
          For example, <code>HBL_camp</code> or <code>homebound</code> can map to <code>homebound</code> campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new mapping */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="campaign-variable">Campaign Variable</Label>
            <Input
              id="campaign-variable"
              placeholder="e.g., HBL_camp, TM_debt"
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAdd();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              This is the value that appears in the URL parameter (e.g., <code>?campaign=HBL_camp</code>)
            </p>
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="campaign-prefix">Campaign Prefix</Label>
            <Select value={newPrefix} onValueChange={(value: Campaign) => setNewPrefix(value)}>
              <SelectTrigger id="campaign-prefix">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homebound">homebound</SelectItem>
                <SelectItem value="tmdebt">tmdebt</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The campaign prefix this variable maps to
            </p>
          </div>
          <Button 
            onClick={handleAdd} 
            disabled={!newVariable.trim() || isSaving}
            className="mb-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </>
            )}
          </Button>
        </div>

        {/* Existing mappings */}
        <div className="space-y-2">
          <Label>Current Mappings</Label>
          {mappings.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
              No mappings configured. Add your first mapping above.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Variable</TableHead>
                    <TableHead>Campaign Prefix</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, index) => (
                    <TableRow key={`${mapping.campaign_variable}-${index}`}>
                      <TableCell className="font-mono text-sm">
                        {mapping.campaign_variable}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
                          {mapping.campaign_prefix}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(index)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-muted p-4 rounded-md space-y-2">
          <h4 className="text-sm font-semibold">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>When a URL contains <code>?campaign=HBL_camp</code>, it will be mapped to the <code>homebound</code> campaign</li>
            <li>Campaign variables are case-insensitive (automatically converted to lowercase)</li>
            <li>If no mapping is found, the system will check if the variable is a direct campaign name (<code>homebound</code> or <code>tmdebt</code>)</li>
            <li>If still not found, it defaults to <code>tmdebt</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

