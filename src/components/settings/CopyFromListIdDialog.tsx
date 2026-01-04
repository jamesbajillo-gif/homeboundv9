import { useState, useEffect } from "react";
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
import { useQuery } from "@tanstack/react-query";

interface CopyFromListIdDialogProps {
  targetListId: string;
  onCopyComplete?: () => void;
}

interface ScriptData {
  step_name: string;
  title: string;
  content: string;
  name: string;
}

interface CustomTabData {
  tab_key: string;
  tab_title: string;
  display_order: number;
  is_active: number;
  tab_type?: string;
  questionnaire_script_name?: string;
  selected_section_ids?: string;
}

export const CopyFromListIdDialog = ({ targetListId, onCopyComplete }: CopyFromListIdDialogProps) => {
  const [open, setOpen] = useState(false);
  const [sourceListId, setSourceListId] = useState<string>("");
  const [copyScripts, setCopyScripts] = useState(true);
  const [copyCustomTabs, setCopyCustomTabs] = useState(true);
  const [copySettings, setCopySettings] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch all list IDs (excluding the target list ID)
  const { data: listConfigs = [] } = useQuery({
    queryKey: ["list-id-configs"],
    queryFn: async () => {
      const data = await mysqlApi.getAll<{ list_id: string; name: string }>(
        "tmdebt_list_id_config",
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
      }, [] as Array<{ list_id: string; name: string }>);
      
      return unique.filter(config => config.list_id !== targetListId);
    },
  });

  const handleCopy = async () => {
    if (!targetListId || !sourceListId) return;
    
    if (targetListId === sourceListId) {
      toast.error("Cannot copy from the same List ID");
      return;
    }
    
    setIsCopying(true);
    
    try {
      // Get the name for the target list ID (required field)
      const existingConfig = await mysqlApi.findOneByFields<{ name: string }>(
        "tmdebt_list_id_config",
        { list_id: targetListId }
      );
      const targetListName = existingConfig?.name || targetListId;

      // 1. Copy scripts from source list ID
      if (copyScripts) {
        try {
          // Fetch all scripts for source list ID
          const sourceScripts = await mysqlApi.findByField<ScriptData>(
            "tmdebt_list_id_config",
            "list_id",
            sourceListId
          );

          for (const script of sourceScripts) {
            if (script.step_name) {
              // Upsert to target list ID config
              await mysqlApi.upsertByFields(
                "tmdebt_list_id_config",
                {
                  list_id: targetListId,
                  step_name: script.step_name,
                  title: script.title,
                  content: script.content,
                  name: targetListName,
                },
                "list_id,step_name"
              );
            }
          }
        } catch (error) {
          console.warn("Failed to copy scripts:", error);
          toast.error("Failed to copy some scripts");
        }
      }

      // 2. Copy custom tabs
      if (copyCustomTabs) {
        try {
          // Fetch source custom tabs
          const sourceTabs = await mysqlApi.findByField<CustomTabData & { id: number }>(
            "tmdebt_listid_custom_tabs",
            "list_id",
            sourceListId,
            { orderBy: "display_order", order: "ASC" }
          );

          const activeTabs = sourceTabs.filter((t: any) => t.is_active === 1);

          for (const tab of activeTabs) {
            try {
              // Create custom tab for target list ID
              const newTabData: any = {
                list_id: targetListId,
                tab_key: tab.tab_key,
                tab_title: tab.tab_title,
                display_order: tab.display_order,
                is_active: 1,
              };

              // Include optional fields if they exist
              if (tab.tab_type) {
                newTabData.tab_type = tab.tab_type;
              }
              if (tab.questionnaire_script_name) {
                newTabData.questionnaire_script_name = tab.questionnaire_script_name;
              }
              if (tab.selected_section_ids) {
                newTabData.selected_section_ids = tab.selected_section_ids;
              }

              // Create in listid custom tabs table
              await mysqlApi.create("tmdebt_listid_custom_tabs", newTabData);

              // Copy the script content too (if it exists)
              const tabScript = await mysqlApi.findOneByFields<ScriptData>(
                "tmdebt_list_id_config",
                { 
                  list_id: sourceListId,
                  step_name: tab.tab_key
                }
              );

              if (tabScript) {
                await mysqlApi.upsertByFields(
                  "tmdebt_list_id_config",
                  {
                    list_id: targetListId,
                    step_name: tab.tab_key,
                    title: tabScript.title,
                    content: tabScript.content,
                    name: targetListName,
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
          toast.error("Failed to copy some custom tabs");
        }
      }

      // 3. Copy visibility and order settings
      if (copySettings) {
        try {
          // Get source visibility and order settings
          const visibilityData = await getAppSetting(`listid_tab_visibility_${sourceListId}`);
          const orderData = await getAppSetting(`listid_tab_order_${sourceListId}`);
          
          // Save visibility to target list ID settings
          if (visibilityData) {
            await setAppSetting(
              `listid_tab_visibility_${targetListId}`,
              visibilityData,
              "json",
              `Tab visibility settings for List ID ${targetListId} (copied from ${sourceListId})`
            );
          }
          
          // Save order to target list ID settings
          if (orderData) {
            await setAppSetting(
              `listid_tab_order_${targetListId}`,
              orderData,
              "json",
              `Tab order settings for List ID ${targetListId} (copied from ${sourceListId})`
            );
          }
        } catch (error) {
          console.warn("Failed to copy settings:", error);
          toast.error("Failed to copy some settings");
        }
      }

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["list-script", targetListId] });
      queryClient.invalidateQueries({ queryKey: ["listid_tab_visibility", targetListId] });
      queryClient.invalidateQueries({ queryKey: ["listid_tab_order", targetListId] });
      queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", targetListId] });
      
      toast.success(`Settings copied from List ID ${sourceListId}!`);
      setOpen(false);
      setSourceListId("");
      onCopyComplete?.();
      
    } catch (error: any) {
      console.error("Copy failed:", error);
      toast.error(error.message || "Failed to copy settings");
    } finally {
      setIsCopying(false);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSourceListId("");
      setCopyScripts(true);
      setCopyCustomTabs(true);
      setCopySettings(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy from List ID...
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Settings from List ID</DialogTitle>
          <DialogDescription>
            Copy scripts, tabs, and settings from another List ID to this List ID ({targetListId}).
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Source List ID</Label>
            <Select value={sourceListId} onValueChange={setSourceListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a List ID to copy from" />
              </SelectTrigger>
              <SelectContent>
                {listConfigs.length === 0 ? (
                  <SelectItem value="" disabled>No other List IDs available</SelectItem>
                ) : (
                  listConfigs.map((config) => (
                    <SelectItem key={config.list_id} value={config.list_id}>
                      {config.list_id} - {config.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>What to copy</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copy-scripts-listid" 
                checked={copyScripts}
                onCheckedChange={(checked) => setCopyScripts(checked === true)}
              />
              <Label htmlFor="copy-scripts-listid" className="font-normal cursor-pointer">
                Scripts (Greeting, Qualification, and all step content)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copy-custom-tabs-listid" 
                checked={copyCustomTabs}
                onCheckedChange={(checked) => setCopyCustomTabs(checked === true)}
              />
              <Label htmlFor="copy-custom-tabs-listid" className="font-normal cursor-pointer">
                Custom tabs and their content
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copy-settings-listid" 
                checked={copySettings}
                onCheckedChange={(checked) => setCopySettings(checked === true)}
              />
              <Label htmlFor="copy-settings-listid" className="font-normal cursor-pointer">
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
            disabled={isCopying || !sourceListId || (!copyScripts && !copyCustomTabs && !copySettings)}
          >
            {isCopying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Copy to {targetListId}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

