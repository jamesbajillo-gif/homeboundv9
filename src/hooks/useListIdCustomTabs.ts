import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";

export interface ListIdCustomTab {
  id?: number;
  list_id: string;
  tab_key: string;
  tab_title: string;
  display_order: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = "tmdebt_listid_custom_tabs";

/**
 * Hook to manage custom script tabs for a specific List ID.
 */
export const useListIdCustomTabs = (listId: string) => {
  const queryClient = useQueryClient();

  // Fetch all custom tabs for the list ID
  const { data: tabs = [], isLoading, refetch } = useQuery({
    queryKey: ["listid_custom_tabs", listId],
    queryFn: async (): Promise<ListIdCustomTab[]> => {
      try {
        const data = await mysqlApi.findByField<ListIdCustomTab>(
          TABLE_NAME,
          "list_id",
          listId,
          { orderBy: "display_order", order: "ASC" }
        );
        return data.filter(tab => tab.is_active === 1);
      } catch (error: any) {
        // Table might not exist yet - return empty array
        console.warn("List ID custom tabs table may not exist yet:", error.message);
        return [];
      }
    },
    enabled: !!listId,
    retry: false,
    staleTime: 60000, // 1 minute - prevents unnecessary refetches
  });

  // Create a new tab
  const createMutation = useMutation({
    mutationFn: async ({ tabTitle }: { tabTitle: string }) => {
      const tabKey = `listid_${listId}_custom_${Date.now()}`;
      
      // Get the next display order
      let nextOrder = 1;
      try {
        const existingTabs = await mysqlApi.findByField<ListIdCustomTab>(
          TABLE_NAME,
          "list_id",
          listId
        );
        nextOrder = existingTabs.length > 0 
          ? Math.max(...existingTabs.map(t => t.display_order)) + 1 
          : 1;
      } catch (e) {
        // Table might not exist
      }

      // Create the custom tab entry
      await mysqlApi.create(TABLE_NAME, {
        list_id: listId,
        tab_key: tabKey,
        tab_title: tabTitle,
        display_order: nextOrder,
        is_active: 1,
      });

      // Also create the script entry for this tab in list_id_config
      await mysqlApi.upsertByFields("tmdebt_list_id_config", {
        list_id: listId,
        step_name: tabKey,
        name: tabTitle,
        title: tabTitle,
        content: "",
      });

      return tabKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", listId] });
      toast.success("Tab created!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create tab");
    },
  });

  // Update tab title
  const updateMutation = useMutation({
    mutationFn: async ({ tabKey, tabTitle }: { tabKey: string; tabTitle: string }) => {
      await mysqlApi.updateByField(TABLE_NAME, "tab_key", tabKey, {
        tab_title: tabTitle,
      });

      // Also update the script title
      await mysqlApi.updateByField("tmdebt_list_id_config", "step_name", tabKey, {
        title: tabTitle,
        name: tabTitle,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", listId] });
      toast.success("Tab updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update tab");
    },
  });

  // Delete (deactivate) a tab
  const deleteMutation = useMutation({
    mutationFn: async ({ tabKey }: { tabKey: string }) => {
      await mysqlApi.updateByField(TABLE_NAME, "tab_key", tabKey, {
        is_active: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", listId] });
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
