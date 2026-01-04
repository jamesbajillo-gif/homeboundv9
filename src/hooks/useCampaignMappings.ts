import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { Campaign } from "@/contexts/CampaignContext";

export interface CampaignMapping {
  id?: number;
  campaign_variable: string; // e.g., "HBL_camp", "homebound", "TM_debt"
  campaign_prefix: Campaign; // "homebound" or "tmdebt"
}

const SETTING_KEY = "tmdebt_campaign_mappings";

/**
 * Hook to manage campaign variable mappings
 * Maps campaign variables (e.g., "HBL_camp", "homebound") to campaign prefixes ("homebound" or "tmdebt")
 */
export const useCampaignMappings = () => {
  const queryClient = useQueryClient();

  // Fetch campaign mappings from app_settings
  const { data: mappings = [], isLoading } = useQuery<CampaignMapping[]>({
    queryKey: ["campaign_mappings"],
    queryFn: async () => {
      try {
        const setting = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("tmdebt_app_settings", "setting_key", SETTING_KEY);

        let result: CampaignMapping[] = [];
        if (setting?.setting_value) {
          const parsed = JSON.parse(setting.setting_value);
          result = Array.isArray(parsed) ? parsed : [];
        } else {
          result = getDefaultMappings();
        }

        // Cache mappings in localStorage for synchronous access
        try {
          localStorage.setItem('tmdebt_campaign_mappings_cache', JSON.stringify(result));
        } catch (e) {
          // Ignore localStorage errors
        }

        return result;
      } catch (error) {
        console.error("Error loading campaign mappings:", error);
        const defaults = getDefaultMappings();
        // Cache defaults too
        try {
          localStorage.setItem('tmdebt_campaign_mappings_cache', JSON.stringify(defaults));
        } catch (e) {
          // Ignore localStorage errors
        }
        return defaults;
      }
    },
  });

  // Save mappings to database
  const saveMappings = useMutation({
    mutationFn: async (newMappings: CampaignMapping[]) => {
      // Validate mappings
      const validated = newMappings.map((m) => ({
        campaign_variable: m.campaign_variable.trim().toLowerCase(),
        campaign_prefix: m.campaign_prefix,
      }));

      // Remove duplicates
      const unique = Array.from(
        new Map(validated.map((m) => [m.campaign_variable, m])).values()
      );

      // Save to app_settings
      await mysqlApi.upsertByFields("tmdebt_app_settings", {
        setting_key: SETTING_KEY,
        setting_value: JSON.stringify(unique),
        setting_type: "json",
      });

      return unique;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["campaign_mappings"], data);
      // Update localStorage cache
      try {
        localStorage.setItem('tmdebt_campaign_mappings_cache', JSON.stringify(data));
      } catch (e) {
        // Ignore localStorage errors
      }
      toast.success("Campaign mappings saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save campaign mappings");
    },
  });

  // Add a new mapping
  const addMapping = useMutation({
    mutationFn: async (mapping: CampaignMapping) => {
      const currentMappings = queryClient.getQueryData<CampaignMapping[]>([
        "campaign_mappings",
      ]) || mappings;

      const newMappings = [...currentMappings, mapping];
      await saveMappings.mutateAsync(newMappings);
      return newMappings;
    },
  });

  // Update a mapping
  const updateMapping = useMutation({
    mutationFn: async ({
      index,
      mapping,
    }: {
      index: number;
      mapping: CampaignMapping;
    }) => {
      const currentMappings = queryClient.getQueryData<CampaignMapping[]>([
        "campaign_mappings",
      ]) || mappings;

      const newMappings = [...currentMappings];
      newMappings[index] = mapping;
      await saveMappings.mutateAsync(newMappings);
      return newMappings;
    },
  });

  // Delete a mapping
  const deleteMapping = useMutation({
    mutationFn: async (index: number) => {
      const currentMappings = queryClient.getQueryData<CampaignMapping[]>([
        "campaign_mappings",
      ]) || mappings;

      const newMappings = currentMappings.filter((_, i) => i !== index);
      await saveMappings.mutateAsync(newMappings);
      return newMappings;
    },
  });

  return {
    mappings,
    isLoading,
    addMapping: addMapping.mutateAsync,
    updateMapping: updateMapping.mutateAsync,
    deleteMapping: deleteMapping.mutateAsync,
    saveMappings: saveMappings.mutateAsync,
    isSaving: saveMappings.isPending,
  };
};

/**
 * Get default campaign mappings
 */
function getDefaultMappings(): CampaignMapping[] {
  return [
    { campaign_variable: "homebound", campaign_prefix: "homebound" },
    { campaign_variable: "hbl_camp", campaign_prefix: "homebound" },
    { campaign_variable: "tmdebt", campaign_prefix: "tmdebt" },
    { campaign_variable: "tm_debt", campaign_prefix: "tmdebt" },
  ];
}

/**
 * Get campaign from variable using mappings
 * This is used by CampaignContext to resolve campaign variables
 */
export async function getCampaignFromVariable(
  variable: string
): Promise<Campaign | null> {
  try {
    const setting = await mysqlApi.findOneByField<{
      setting_key: string;
      setting_value: string;
    }>("tmdebt_app_settings", "setting_key", SETTING_KEY);

    let mappings: CampaignMapping[] = [];

    if (setting?.setting_value) {
      const parsed = JSON.parse(setting.setting_value);
      mappings = Array.isArray(parsed) ? parsed : [];
    } else {
      // Fallback to default mappings if not in database
      mappings = getDefaultMappings();
    }

    const normalizedVariable = variable.toLowerCase().trim();
    const mapping = mappings.find(
      (m) => m.campaign_variable.toLowerCase() === normalizedVariable
    );

    if (mapping) {
      return mapping.campaign_prefix;
    }

    // If no mapping found, check if it's a direct campaign name
    if (normalizedVariable === "homebound" || normalizedVariable === "tmdebt") {
      return normalizedVariable as Campaign;
    }

    return null;
  } catch (error) {
    console.error("Error getting campaign from variable:", error);
    // Fallback to default mappings
    const defaultMappings = getDefaultMappings();
    const normalizedVariable = variable.toLowerCase().trim();
    const mapping = defaultMappings.find(
      (m) => m.campaign_variable.toLowerCase() === normalizedVariable
    );
    return mapping?.campaign_prefix || null;
  }
}

