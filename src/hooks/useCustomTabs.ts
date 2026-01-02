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
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = "homebound_custom_tabs";

/**
 * Hook to manage custom script tabs.
 * Each custom tab creates a corresponding entry in homebound_script table.
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
    mutationFn: async ({ tabTitle }: { tabTitle: string }) => {
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
      await mysqlApi.create(TABLE_NAME, {
        tab_key: tabKey,
        tab_title: tabTitle,
        group_type: groupType,
        display_order: nextOrder,
        is_active: 1,
      });

      // Also create the script entry for this tab
      await mysqlApi.upsertByFields("homebound_script", {
        step_name: tabKey,
        title: tabTitle,
        content: "",
        button_config: JSON.stringify([]),
      });

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
      await mysqlApi.updateByField("homebound_script", "step_name", tabKey, {
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

  const createTab = async (tabTitle: string) => {
    return await createMutation.mutateAsync({ tabTitle });
  };

  const updateTab = async (tabKey: string, tabTitle: string) => {
    await updateMutation.mutateAsync({ tabKey, tabTitle });
  };

  const deleteTab = async (tabKey: string) => {
    await deleteMutation.mutateAsync({ tabKey });
  };

  return {
    tabs,
    isLoading,
    createTab,
    updateTab,
    deleteTab,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
  };
};
