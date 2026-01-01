import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import {
  QualificationConfig,
  DEFAULT_QUALIFICATION_CONFIG,
  SAMPLE_QUALIFICATION_CONFIG,
  deserializeConfig,
  serializeConfig,
} from "@/config/qualificationConfig";

const MASTER_CONFIG_KEY = "qualification_master_config";

/**
 * Hook to fetch and manage the master qualification configuration.
 * This is the single source of truth created in /settings/forms.
 */
export const useMasterQualificationConfig = () => {
  const queryClient = useQueryClient();

  // Fetch master config
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["masterQualificationConfig"],
    queryFn: async () => {
      const result = await mysqlApi.findOneByField<{ key_name: string; key_value: string }>(
        "homebound_app_settings",
        "key_name",
        MASTER_CONFIG_KEY
      );
      if (result?.key_value) {
        const parsed = deserializeConfig(result.key_value);
        if (parsed) return parsed;
      }
      return DEFAULT_QUALIFICATION_CONFIG;
    },
  });

  // Save master config
  const saveMutation = useMutation({
    mutationFn: async (newConfig: QualificationConfig) => {
      const serialized = serializeConfig(newConfig);
      
      // Check if config exists
      const existing = await mysqlApi.findOneByField<{ id: number }>(
        "homebound_app_settings",
        "key_name",
        MASTER_CONFIG_KEY
      );

      if (existing) {
        await mysqlApi.updateById("homebound_app_settings", existing.id, {
          key_value: serialized,
        });
      } else {
        await mysqlApi.create("homebound_app_settings", {
          key_name: MASTER_CONFIG_KEY,
          key_value: serialized,
          key_type: "json",
          description: "Master qualification form configuration",
        });
      }

      return newConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterQualificationConfig"] });
      // Also invalidate any script-specific qualification queries
      queryClient.invalidateQueries({ queryKey: ["qualificationConfig"] });
    },
    onError: (error) => {
      console.error("Failed to save master config:", error);
      toast.error("Failed to save configuration");
    },
  });

  // Load sample template
  const loadSampleTemplate = () => {
    saveMutation.mutate(SAMPLE_QUALIFICATION_CONFIG);
    toast.success("Sample template loaded");
  };

  // Clear all sections
  const clearAllSections = () => {
    saveMutation.mutate(DEFAULT_QUALIFICATION_CONFIG);
    toast.success("All sections cleared");
  };

  // Export config as JSON file
  const exportConfig = () => {
    if (!config) return;
    
    const exportData = JSON.stringify(config, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qualification-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration exported");
  };

  // Import config from JSON
  const importConfig = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as QualificationConfig;
      if (!parsed.version || !Array.isArray(parsed.sections)) {
        throw new Error("Invalid configuration format");
      }
      saveMutation.mutate(parsed);
      toast.success("Configuration imported");
      return true;
    } catch (err) {
      toast.error("Failed to import configuration: Invalid format");
      return false;
    }
  };

  return {
    config: config || DEFAULT_QUALIFICATION_CONFIG,
    isLoading,
    isSaving: saveMutation.isPending,
    error: error?.message,
    saveConfig: saveMutation.mutate,
    loadSampleTemplate,
    clearAllSections,
    exportConfig,
    importConfig,
  };
};
