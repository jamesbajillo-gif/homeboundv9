import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QualificationConfig, deserializeConfig, DEFAULT_QUALIFICATION_CONFIG } from "@/config/qualificationConfig";

export type TabType = "script" | "questionnaire";

interface AddTabDialogProps {
  onAdd: (title: string, tabType?: TabType, questionnaireScriptName?: string, selectedSectionIds?: string[]) => Promise<string | void>;
  isCreating: boolean;
  groupType?: "inbound" | "outbound";
}

export const AddTabDialog = ({ onAdd, isCreating, groupType = "inbound" }: AddTabDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tabType, setTabType] = useState<TabType>("script");
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  // Automatically determine questionnaire script name based on groupType
  // Inbound scripts use inbound_qualification, outbound scripts use outbound_qualification
  const questionnaireScriptName = tabType === "questionnaire" 
    ? (groupType === "outbound" ? "outbound_qualification" : "inbound_qualification")
    : "";

  // Fetch qualification config based on groupType (not questionnaireScriptName)
  const configKey = `tmdebt_qualification_config_${groupType}`;
  
  const { data: qualificationConfig, isLoading: isLoadingConfig } = useQuery<QualificationConfig>({
    queryKey: ["qualification_config_for_tab", configKey, groupType],
    queryFn: async () => {
      try {
        const configData = await mysqlApi.findOneByField<{ setting_key: string; setting_value: string }>(
          'tmdebt_app_settings',
          'setting_key',
          configKey
        );

        if (configData?.setting_value) {
          const parsed = deserializeConfig(configData.setting_value);
          if (parsed) {
            return parsed;
          }
        }
        return DEFAULT_QUALIFICATION_CONFIG;
      } catch (error) {
        console.error('Error loading qualification config:', error);
        return DEFAULT_QUALIFICATION_CONFIG;
      }
    },
    enabled: tabType === "questionnaire",
  });

  // Reset selected sections when tab type or qualification config changes
  useEffect(() => {
    if (tabType === "questionnaire" && qualificationConfig) {
      // Select all enabled sections by default
      const enabledSectionIds = qualificationConfig.sections
        .filter(s => s.enabled)
        .map(s => s.id);
      setSelectedSectionIds(enabledSectionIds);
    } else {
      setSelectedSectionIds([]);
    }
  }, [tabType, qualificationConfig]);

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSectionIds(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSelectAll = () => {
    if (!qualificationConfig) return;
    const enabledSectionIds = qualificationConfig.sections
      .filter(s => s.enabled)
      .map(s => s.id);
    setSelectedSectionIds(enabledSectionIds);
  };

  const handleDeselectAll = () => {
    setSelectedSectionIds([]);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    // Questionnaire option removed - qualification is already a default tab
    // Users can duplicate it instead
    
    await onAdd(
      title.trim(),
      tabType,
      undefined, // questionnaireScriptName - not used anymore
      undefined  // selectedSectionIds - not used anymore
    );
    setTitle("");
    setTabType("script");
    setSelectedSectionIds([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Tab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tab</DialogTitle>
          <DialogDescription>
            Create a new tab. Choose between a script tab or a questionnaire form.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tab-title">Tab Title</Label>
            <Input
              id="tab-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tab title (e.g., Follow-up, Rebuttals)"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tab-type">Tab Type</Label>
            <Select value={tabType} onValueChange={(value: TabType) => {
              setTabType(value);
            }}>
              <SelectTrigger id="tab-type">
                <SelectValue placeholder="Select tab type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="script">Script Tab</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Note: Qualification form is already available as a default tab. You can rename or duplicate it.
            </p>
          </div>

          {false && tabType === "questionnaire" && (
            <>
              <div className="space-y-2">
                <Label>Questionnaire Type</Label>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  Using <strong>{groupType === "outbound" ? "Outbound" : "Inbound"}</strong> Qualification
                  <span className="text-xs block mt-1">
                    This matches your current script type ({groupType}).
                  </span>
                </div>
              </div>

              {questionnaireScriptName && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Sections</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="h-7 text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="h-7 text-xs"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  {isLoadingConfig ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : qualificationConfig ? (
                    <ScrollArea className="h-48 rounded-md border p-4">
                      <div className="space-y-3">
                        {qualificationConfig.sections
                          .filter(section => section.enabled)
                          .map((section) => (
                            <div key={section.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`section-${section.id}`}
                                checked={selectedSectionIds.includes(section.id)}
                                onCheckedChange={() => handleSectionToggle(section.id)}
                              />
                              <Label
                                htmlFor={`section-${section.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                <div>
                                  <div className="font-medium">{section.title}</div>
                                  {section.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {section.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {section.questions.filter(q => q.enabled).length} question(s)
                                  </div>
                                </div>
                              </Label>
                            </div>
                          ))}
                        {qualificationConfig.sections.filter(s => s.enabled).length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No enabled sections available
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No questionnaire configuration found
                    </div>
                  )}
                  {selectedSectionIds.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedSectionIds.length} section(s) selected
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={
              !title.trim() || 
              isCreating || 
              (tabType === "questionnaire" && (!questionnaireScriptName || selectedSectionIds.length === 0))
            }
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
