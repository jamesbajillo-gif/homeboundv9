import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCampaign, setSettingsCampaign, getSettingsCampaign, setDefaultCampaign, getDefaultCampaignSetting, Campaign } from "@/contexts/CampaignContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const SettingsCampaignSelector = () => {
  const { campaign, refreshCampaign } = useCampaign();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign>(() => getSettingsCampaign() || campaign);
  const [isDefault, setIsDefault] = useState<boolean>(() => {
    const defaultCampaign = getDefaultCampaignSetting();
    return defaultCampaign === selectedCampaign;
  });

  // Sync selected campaign with context campaign
  useEffect(() => {
    const settingsCampaign = getSettingsCampaign();
    if (settingsCampaign) {
      setSelectedCampaign(settingsCampaign);
    } else {
      setSelectedCampaign(campaign);
    }
    
    // Update isDefault based on current default campaign
    const defaultCampaign = getDefaultCampaignSetting();
    setIsDefault(defaultCampaign === (settingsCampaign || campaign));
  }, [campaign]);

  const handleCampaignChange = async (value: Campaign) => {
    setSelectedCampaign(value);
    setSettingsCampaign(value);
    
    // If it's set as default, update default too
    if (isDefault) {
      setDefaultCampaign(value);
    }
    
    // Refresh campaign context first
    refreshCampaign();
    
    // Wait a bit for the campaign context to update, then invalidate only campaign-specific queries
    // This prevents invalidating unrelated queries (like Zapier, VICI settings, etc.)
    setTimeout(async () => {
      // Only invalidate queries that are campaign-dependent
      // This prevents mass refetch of all queries and reduces API load
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          
          // Campaign-dependent query keys
          const campaignDependentKeys = [
            'scripts',
            'custom_tabs',
            'listid_custom_tabs',
            'list-script',
            'listid_tab_visibility',
            'listid_tab_order',
            'spiel_alts',
            'objection_alts',
            'question_alts',
            'submissions',
            'qualification',
            'formFields',
            'list-id-configs'
          ];
          
          // Check if any part of the query key matches campaign-dependent keys
          return campaignDependentKeys.some(depKey => 
            key.some(k => 
              typeof k === 'string' && k.includes(depKey)
            )
          );
        }
      });
      
      // Let React Query refetch naturally based on component needs
      // This respects staleTime and prevents unnecessary immediate refetches
      
      toast.success(`Switched to ${value} campaign`, {
        description: 'All settings and data will now use this campaign.',
      });
    }, 150);
  };

  const handleSetAsDefault = (checked: boolean) => {
    setIsDefault(checked);
    if (checked) {
      setDefaultCampaign(selectedCampaign);
      toast.success(`${selectedCampaign === 'homebound' ? 'Homebound' : 'TM Debt'} set as default`, {
        description: 'This campaign will be loaded by default when no URL parameter is specified.',
      });
    } else {
      setDefaultCampaign(null);
      toast.info('Default campaign removed', {
        description: 'Will use tmdebt as default when no URL parameter is specified.',
      });
    }
  };

  return (
    <div className="flex-none bg-muted/50 border-b p-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label htmlFor="campaign-select" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Campaign:
          </Label>
          <Select value={selectedCampaign} onValueChange={handleCampaignChange}>
            <SelectTrigger id="campaign-select" className="w-[180px]">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tmdebt">TM Debt</SelectItem>
              <SelectItem value="homebound">Homebound</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-2">
            {selectedCampaign === 'homebound' ? 'Homebound' : 'TM Debt'}
          </Badge>
          <div className="flex items-center gap-2 ml-2">
            <Checkbox
              id="set-as-default"
              checked={isDefault}
              onCheckedChange={handleSetAsDefault}
            />
            <Label htmlFor="set-as-default" className="text-xs cursor-pointer whitespace-nowrap">
              Set as Default
            </Label>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            All settings and data will use the selected campaign
          </span>
        </div>
      </div>
    </div>
  );
};

