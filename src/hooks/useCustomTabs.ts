import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";

export interface CustomTab {
  id?: number;
  tab_key: string;
  tab_title: string;
  group_type: "inbound" | "outbound";
  display_order: number;
  is_active: number;
  tab_type?: "script" | "questionnaire";
  questionnaire_script_name?: string;
  selected_section_ids?: string; // JSON array of section IDs
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = "tmdebt_custom_tabs";

/**
 * Hook to manage custom script tabs.
 * Each custom tab creates a corresponding entry in tmdebt_script table.
 */
export const useCustomTabs = (groupType: "inbound" | "outbound") => {
  const queryClient = useQueryClient();

  // Fetch all custom tabs for the group
  const { data: tabs = [], isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "custom_tabs", groupType],
    queryFn: async (): Promise<CustomTab[]> => {
      try {
        const data = await mysqlApi.findByField<CustomTab>(
          TABLE_NAME,
          "group_type",
          groupType,
          { orderBy: "display_order", order: "ASC" }
        );
        return data.filter(tab => tab.is_active === 1);
      } catch (error: any) {
        // Table might not exist yet - return empty array
        console.warn("Custom tabs table may not exist yet:", error.message);
        return [];
      }
    },
    retry: false, // Don't retry if table doesn't exist
  });

  // Create a new tab
  const createMutation = useMutation({
    mutationFn: async ({ 
      tabTitle, 
      tabType = "script", 
      questionnaireScriptName,
      selectedSectionIds
    }: { 
      tabTitle: string;
      tabType?: "script" | "questionnaire";
      questionnaireScriptName?: string;
      selectedSectionIds?: string[];
    }) => {
      // Generate a unique tab key
      const tabKey = `${groupType}_custom_${Date.now()}`;
      
      // Get the next display order
      const existingTabs = await mysqlApi.findByField<CustomTab>(
        TABLE_NAME,
        "group_type",
        groupType
      );
      const nextOrder = existingTabs.length > 0 
        ? Math.max(...existingTabs.map(t => t.display_order)) + 1 
        : 1;

      // Create the custom tab entry
      const tabData: any = {
        tab_key: tabKey,
        tab_title: tabTitle,
        group_type: groupType,
        display_order: nextOrder,
        is_active: 1,
      };

      // Add questionnaire fields if it's a questionnaire tab
      if (tabType === "questionnaire" && questionnaireScriptName) {
        tabData.tab_type = "questionnaire";
        tabData.questionnaire_script_name = questionnaireScriptName;
        if (selectedSectionIds && selectedSectionIds.length > 0) {
          tabData.selected_section_ids = JSON.stringify(selectedSectionIds);
        }
      } else {
        tabData.tab_type = "script";
      }

      await mysqlApi.create(TABLE_NAME, tabData);

      // Only create script entry for script tabs
      if (tabType === "script") {
        await mysqlApi.upsertByFields("tmdebt_script", {
          step_name: tabKey,
          title: tabTitle,
          content: "",
          button_config: JSON.stringify([]),
        });
      }

      return tabKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "custom_tabs", groupType] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
      toast.success("Tab created!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create tab");
    },
  });

  // Update tab title
  const updateMutation = useMutation({
    mutationFn: async ({ tabKey, tabTitle }: { tabKey: string; tabTitle: string }) => {
      // Update the tab entry
      await mysqlApi.updateByField(TABLE_NAME, "tab_key", tabKey, {
        tab_title: tabTitle,
      });

      // Also update the script title
      await mysqlApi.updateByField("tmdebt_script", "step_name", tabKey, {
        title: tabTitle,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "custom_tabs", groupType] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
      toast.success("Tab updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update tab");
    },
  });

  // Delete (deactivate) a tab
  const deleteMutation = useMutation({
    mutationFn: async ({ tabKey }: { tabKey: string }) => {
      // Soft delete by setting is_active to 0
      await mysqlApi.updateByField(TABLE_NAME, "tab_key", tabKey, {
        is_active: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "custom_tabs", groupType] });
      toast.success("Tab deleted!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete tab");
    },
  });

  const createTab = async (
    tabTitle: string, 
    tabType?: "script" | "questionnaire",
    questionnaireScriptName?: string,
    selectedSectionIds?: string[]
  ) => {
    return await createMutation.mutateAsync({ tabTitle, tabType, questionnaireScriptName, selectedSectionIds });
  };

  const updateTab = async (tabKey: string, tabTitle: string) => {
    await updateMutation.mutateAsync({ tabKey, tabTitle });
  };

  const deleteTab = async (tabId: number) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      await deleteMutation.mutateAsync({ tabKey: tab.tab_key });
    }
  };

  // Reorder tabs by updating display_order
  const reorderTabsMutation = useMutation({
    mutationFn: async ({ tabIds }: { tabIds: string[] }) => {
      // Update display_order for each tab based on new order
      for (let i = 0; i < tabIds.length; i++) {
        const tab = tabs.find(t => t.tab_key === tabIds[i]);
        if (tab && tab.id) {
          await mysqlApi.updateById(TABLE_NAME, tab.id, {
            display_order: i + 1,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "custom_tabs", groupType] });
      toast.success("Tabs reordered!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reorder tabs");
    },
  });

  const reorderTabs = async (tabKey: string, newOrder: number) => {
    // Get all custom tabs sorted by current display_order
    const sortedTabs = [...tabs].sort((a, b) => a.display_order - b.display_order);
    const tabIndex = sortedTabs.findIndex(t => t.tab_key === tabKey);
    if (tabIndex === -1) return;
    
    // Remove tab from current position
    const [movedTab] = sortedTabs.splice(tabIndex, 1);
    
    // Calculate the actual new index (accounting for default tabs that come before)
    // Default tabs typically have display_order 0-1, so custom tabs start from display_order 2+
    const minCustomOrder = sortedTabs.length > 0 
      ? Math.min(...sortedTabs.map(t => t.display_order))
      : newOrder;
    
    // Insert at new position
    sortedTabs.splice(newOrder - minCustomOrder, 0, movedTab);
    
    // Update all display orders starting from the minimum order
    const tabKeys = sortedTabs.map(t => t.tab_key);
    await reorderTabsMutation.mutateAsync({ tabIds: tabKeys });
  };

  // Update tab by ID (for use in editor)
  const updateTabById = async (tabId: number, updates: { tab_title?: string }) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      await updateMutation.mutateAsync({ tabKey: tab.tab_key, tabTitle: updates.tab_title || tab.tab_title });
    }
  };

  return {
    tabs,
    isLoading,
    createTab,
    updateTab,
    updateTabById,
    deleteTab,
    reorderTabs,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderTabsMutation.isPending,
    refetch,
  };
};
