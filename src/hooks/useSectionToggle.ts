import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";

interface EnabledSections {
  sectionIds: string[];
}

const ENABLED_SECTIONS_KEY_PREFIX = "qualification_enabled_sections_";

/**
 * Hook to manage which qualification sections are enabled for each script type.
 * Sections are created in /settings/forms (master config) and then toggled on/off per script type.
 */
export const useSectionToggle = (scriptType: string) => {
  const queryClient = useQueryClient();
  const settingsKey = `${ENABLED_SECTIONS_KEY_PREFIX}${scriptType}`;

  // Fetch enabled section IDs for this script type
  const { data, isLoading, error } = useQuery({
    queryKey: ["enabledSections", scriptType],
    queryFn: async () => {
      const result = await mysqlApi.findOneByField<{ key_name: string; key_value: string }>(
        "homebound_app_settings",
        "key_name",
        settingsKey
      );
      if (result?.key_value) {
        try {
          return JSON.parse(result.key_value) as EnabledSections;
        } catch {
          return { sectionIds: [] };
        }
      }
      return { sectionIds: [] };
    },
  });

  // Save enabled section IDs
  const saveMutation = useMutation({
    mutationFn: async (enabledSections: EnabledSections) => {
      const serialized = JSON.stringify(enabledSections);
      
      // Check if setting exists
      const existing = await mysqlApi.findOneByField<{ id: number }>(
        "homebound_app_settings",
        "key_name",
        settingsKey
      );

      if (existing) {
        await mysqlApi.updateById("homebound_app_settings", existing.id, {
          key_value: serialized,
        });
      } else {
        await mysqlApi.create("homebound_app_settings", {
          key_name: settingsKey,
          key_value: serialized,
          key_type: "json",
          description: `Enabled qualification sections for ${scriptType}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enabledSections", scriptType] });
    },
    onError: (error) => {
      console.error("Failed to save enabled sections:", error);
      toast.error("Failed to save section settings");
    },
  });

  const enabledSectionIds = data?.sectionIds || [];

  // Toggle a specific section on/off
  const toggleSection = (sectionId: string, enabled: boolean) => {
    const newIds = enabled
      ? [...enabledSectionIds, sectionId]
      : enabledSectionIds.filter((id) => id !== sectionId);
    
    saveMutation.mutate({ sectionIds: newIds });
  };

  // Enable multiple sections at once
  const enableSections = (sectionIds: string[]) => {
    const newIds = [...new Set([...enabledSectionIds, ...sectionIds])];
    saveMutation.mutate({ sectionIds: newIds });
  };

  // Disable all sections
  const disableAllSections = () => {
    saveMutation.mutate({ sectionIds: [] });
  };

  // Enable all sections (pass available section IDs)
  const enableAllSections = (availableSectionIds: string[]) => {
    saveMutation.mutate({ sectionIds: availableSectionIds });
  };

  // Check if a section is enabled
  const isSectionEnabled = (sectionId: string) => {
    return enabledSectionIds.includes(sectionId);
  };

  return {
    enabledSectionIds,
    isLoading,
    isSaving: saveMutation.isPending,
    error: error?.message,
    toggleSection,
    enableSections,
    disableAllSections,
    enableAllSections,
    isSectionEnabled,
  };
};
