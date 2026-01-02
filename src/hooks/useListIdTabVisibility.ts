import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { toast } from "sonner";

interface TabVisibility {
  [tabKey: string]: boolean;
}

/**
 * Hook to manage tab visibility settings for a specific List ID.
 * Uses the same pattern as useTabVisibility for inbound/outbound.
 */
export const useListIdTabVisibility = (listId: string) => {
  const queryClient = useQueryClient();
  const settingKey = `listid_tab_visibility_${listId}`;

  // Fetch visibility settings
  const { data: visibility = {}, isLoading } = useQuery({
    queryKey: ["listid_tab_visibility", listId],
    queryFn: async (): Promise<TabVisibility> => {
      try {
        const data = await getAppSetting(settingKey);
        if (data) {
          return JSON.parse(data);
        }
        return {};
      } catch (error) {
        console.warn("Error loading list ID tab visibility:", error);
        return {};
      }
    },
    enabled: !!listId,
  });

  // Update visibility for a tab
  const updateMutation = useMutation({
    mutationFn: async ({ tabKey, isVisible }: { tabKey: string; isVisible: boolean }) => {
      const current = { ...visibility };
      current[tabKey] = isVisible;
      
      await setAppSetting(
        settingKey,
        JSON.stringify(current),
        "json",
        `Tab visibility settings for List ID ${listId}`
      );
      
      return current;
    },
    onSuccess: (newVisibility) => {
      queryClient.setQueryData(["listid_tab_visibility", listId], newVisibility);
      toast.success("Visibility updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update visibility");
    },
  });

  const setTabVisibility = async (tabKey: string, isVisible: boolean) => {
    await updateMutation.mutateAsync({ tabKey, isVisible });
  };

  // Check if a tab is visible (default to true if not set)
  const isTabVisible = (tabKey: string): boolean => {
    return visibility[tabKey] !== false;
  };

  return {
    visibility,
    isLoading,
    setTabVisibility,
    isTabVisible,
    isUpdating: updateMutation.isPending,
  };
};
