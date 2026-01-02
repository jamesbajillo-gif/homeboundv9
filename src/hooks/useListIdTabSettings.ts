import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { toast } from "sonner";

interface ListIdTabSettings {
  visibility: Record<string, boolean>;
  order: string[];
}

/**
 * Hook to manage tab visibility and order settings for a specific List ID.
 * Stores settings as app settings in the database.
 */
export const useListIdTabSettings = (listId: string) => {
  const queryClient = useQueryClient();
  const settingKey = `listid_tabs_${listId}`;

  // Fetch settings
  const { data: settings = { visibility: {}, order: [] }, isLoading } = useQuery({
    queryKey: ["listid_tab_settings", listId],
    queryFn: async (): Promise<ListIdTabSettings> => {
      try {
        const data = await getAppSetting(settingKey);
        if (data) {
          return JSON.parse(data);
        }
        return { visibility: {}, order: [] };
      } catch (error) {
        console.warn("Error loading list ID tab settings:", error);
        return { visibility: {}, order: [] };
      }
    },
    enabled: !!listId,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (newSettings: ListIdTabSettings) => {
      await setAppSetting(
        settingKey,
        JSON.stringify(newSettings),
        "json",
        `Tab settings for List ID ${listId}`
      );
      return newSettings;
    },
    onSuccess: (newSettings) => {
      queryClient.setQueryData(["listid_tab_settings", listId], newSettings);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  // Visibility helpers
  const isTabVisible = (tabKey: string): boolean => {
    return settings.visibility[tabKey] !== false;
  };

  const setTabVisibility = async (tabKey: string, isVisible: boolean) => {
    const newSettings = {
      ...settings,
      visibility: { ...settings.visibility, [tabKey]: isVisible },
    };
    await updateMutation.mutateAsync(newSettings);
    toast.success("Visibility updated");
  };

  // Order helpers
  const setTabOrder = async (newOrder: string[]) => {
    const newSettings = {
      ...settings,
      order: newOrder,
    };
    await updateMutation.mutateAsync(newSettings);
    toast.success("Order updated");
  };

  const getOrderedTabs = <T extends { key?: string; tab_key?: string }>(tabs: T[]): T[] => {
    if (settings.order.length === 0) return tabs;
    
    const getKey = (tab: T) => tab.key || tab.tab_key || "";
    
    return [...tabs].sort((a, b) => {
      const aIndex = settings.order.indexOf(getKey(a));
      const bIndex = settings.order.indexOf(getKey(b));
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  };

  return {
    settings,
    isLoading,
    isTabVisible,
    setTabVisibility,
    setTabOrder,
    getOrderedTabs,
    isUpdating: updateMutation.isPending,
  };
};
