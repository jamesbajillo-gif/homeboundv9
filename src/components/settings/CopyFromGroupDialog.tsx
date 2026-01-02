import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";
import { mysqlApi } from "@/lib/mysqlApi";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CopyFromGroupDialogProps {
  listId: string;
  onCopyComplete?: () => void;
}

interface ScriptData {
  step_name: string;
  title: string;
  content: string;
}

interface CustomTabData {
  tab_key: string;
  tab_title: string;
  display_order: number;
}

const FIXED_STEPS = ["greeting", "qualification", "objectionHandling", "closingNotInterested", "closingSuccess"];

export const CopyFromGroupDialog = ({ listId, onCopyComplete }: CopyFromGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [sourceGroup, setSourceGroup] = useState<"inbound" | "outbound">("inbound");
  const [copyScripts, setCopyScripts] = useState(true);
  const [copyCustomTabs, setCopyCustomTabs] = useState(true);
  const [copySettings, setCopySettings] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  
  const queryClient = useQueryClient();

  const handleCopy = async () => {
    if (!listId) return;
    
    setIsCopying(true);
    
    try {
      // Get the name for the list ID (required field)
      const existingConfig = await mysqlApi.findOneByFields<{ name: string }>(
        "homebound_list_id_config",
        { list_id: listId }
      );
      const listName = existingConfig?.name || listId;

      // 1. Copy fixed scripts
      if (copyScripts) {
        for (const stepName of FIXED_STEPS) {
          try {
            // Fetch source script
            const sourceScript = await mysqlApi.findOneByFields<ScriptData>(
              "homebound_script",
              { step_name: stepName }
            );
            
            if (sourceScript) {
              // Upsert to list ID config
              await mysqlApi.upsertByFields(
                "homebound_list_id_config",
                {
                  list_id: listId,
                  step_name: stepName,
                  title: sourceScript.title,
                  content: sourceScript.content,
                  name: listName,
                },
                "list_id,step_name"
              );
            }
          } catch (error) {
            console.warn(`Failed to copy script ${stepName}:`, error);
          }
        }
      }

      // 2. Copy custom tabs
      if (copyCustomTabs) {
        try {
          // Fetch source custom tabs
          const sourceTabs = await mysqlApi.findByField<CustomTabData & { id: number }>(
            "homebound_custom_tabs",
            "group_type",
            sourceGroup,
            { orderBy: "display_order", order: "ASC" }
          );

          const activeTabs = sourceTabs.filter((t: any) => t.is_active === 1);

          for (const tab of activeTabs) {
            // Create custom tab for this list ID
            const newTabKey = `listid_${listId}_${tab.tab_key}`;
            
            try {
              // Create in listid custom tabs table
              await mysqlApi.create("homebound_listid_custom_tabs", {
                list_id: listId,
                tab_key: newTabKey,
                tab_title: tab.tab_title,
                display_order: tab.display_order,
                is_active: 1,
              });

              // Copy the script content too
              const tabScript = await mysqlApi.findOneByFields<ScriptData>(
                "homebound_script",
                { step_name: tab.tab_key }
              );

              if (tabScript) {
                await mysqlApi.upsertByFields(
                  "homebound_list_id_config",
                  {
                    list_id: listId,
                    step_name: newTabKey,
                    title: tabScript.title,
                    content: tabScript.content,
                    name: listName,
                  },
                  "list_id,step_name"
                );
              }
            } catch (error) {
              console.warn(`Failed to copy custom tab ${tab.tab_key}:`, error);
            }
          }
        } catch (error) {
          console.warn("Failed to copy custom tabs:", error);
        }
      }

      // 3. Copy visibility and order settings (using same format as inbound/outbound)
      if (copySettings) {
        try {
          // Get source visibility and order (separate settings like inbound/outbound)
          const visibilityData = await getAppSetting(`tab_visibility_${sourceGroup}`);
          const orderData = await getAppSetting(`tab_order_${sourceGroup}`);
          
          // Save visibility to list ID settings (separate key like inbound/outbound)
          if (visibilityData) {
            await setAppSetting(
              `listid_tab_visibility_${listId}`,
              visibilityData,
              "json",
              `Tab visibility settings for List ID ${listId} (copied from ${sourceGroup})`
            );
          }
          
          // Save order to list ID settings (separate key like inbound/outbound)
          if (orderData) {
            await setAppSetting(
              `listid_tab_order_${listId}`,
              orderData,
              "json",
              `Tab order settings for List ID ${listId} (copied from ${sourceGroup})`
            );
          }
        } catch (error) {
          console.warn("Failed to copy settings:", error);
        }
      }

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["list-script", listId] });
      queryClient.invalidateQueries({ queryKey: ["listid_tab_visibility", listId] });
      queryClient.invalidateQueries({ queryKey: ["listid_tab_order", listId] });
      queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", listId] });
      
      toast.success(`Settings copied from ${sourceGroup}!`);
      setOpen(false);
      onCopyComplete?.();
      
    } catch (error: any) {
      console.error("Copy failed:", error);
      toast.error(error.message || "Failed to copy settings");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy from...
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Settings</DialogTitle>
          <DialogDescription>
            Copy scripts and settings from Inbound or Outbound configuration to this List ID.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={sourceGroup} onValueChange={(v) => setSourceGroup(v as "inbound" | "outbound")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">Inbound Scripts</SelectItem>
                <SelectItem value="outbound">Outbound Scripts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>What to copy</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copy-scripts" 
                checked={copyScripts}
                onCheckedChange={(checked) => setCopyScripts(checked === true)}
              />
              <Label htmlFor="copy-scripts" className="font-normal cursor-pointer">
                Fixed scripts (Greeting, Qualification, Objections, Closing)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copy-custom-tabs" 
                checked={copyCustomTabs}
                onCheckedChange={(checked) => setCopyCustomTabs(checked === true)}
              />
              <Label htmlFor="copy-custom-tabs" className="font-normal cursor-pointer">
                Custom tabs and their content
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copy-settings" 
                checked={copySettings}
                onCheckedChange={(checked) => setCopySettings(checked === true)}
              />
              <Label htmlFor="copy-settings" className="font-normal cursor-pointer">
                Tab visibility and order settings
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCopying}>
            Cancel
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={isCopying || (!copyScripts && !copyCustomTabs && !copySettings)}
          >
            {isCopying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Copy to {listId}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
