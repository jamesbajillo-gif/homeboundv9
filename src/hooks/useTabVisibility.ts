import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { toast } from "sonner";

const VISIBILITY_KEY_PREFIX = "tab_visibility";

interface TabVisibility {
  [tabKey: string]: boolean;
}

/**
 * Hook to manage tab visibility settings for navigation.
 * Stores visibility as app settings in the database.
 */
export const useTabVisibility = (groupType: "inbound" | "outbound") => {
  const queryClient = useQueryClient();
  const settingKey = `${VISIBILITY_KEY_PREFIX}_${groupType}`;

  // Fetch visibility settings
  const { data: visibility = {}, isLoading } = useQuery({
    queryKey: ["tab_visibility", groupType],
    queryFn: async (): Promise<TabVisibility> => {
      try {
        const data = await getAppSetting(settingKey);
        if (data) {
          return JSON.parse(data);
        }
        return {};
      } catch (error) {
        console.warn("Error loading tab visibility:", error);
        return {};
      }
    },
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
        `Tab visibility settings for ${groupType}`
      );
      
      return current;
    },
    onSuccess: (newVisibility) => {
      queryClient.setQueryData(["tab_visibility", groupType], newVisibility);
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
  // Qualification tabs default to visible but can be toggled
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
