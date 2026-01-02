import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { toast } from "sonner";

const ORDER_KEY_PREFIX = "tab_order";

/**
 * Hook to manage tab order settings for navigation.
 * Stores order as app settings in the database.
 */
export const useTabOrder = (groupType: "inbound" | "outbound") => {
  const queryClient = useQueryClient();
  const settingKey = `${ORDER_KEY_PREFIX}_${groupType}`;

  // Fetch order settings
  const { data: order = [], isLoading } = useQuery({
    queryKey: ["tab_order", groupType],
    queryFn: async (): Promise<string[]> => {
      try {
        const data = await getAppSetting(settingKey);
        if (data) {
          return JSON.parse(data);
        }
        return [];
      } catch (error) {
        console.warn("Error loading tab order:", error);
        return [];
      }
    },
  });

  // Update order
  const updateMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      await setAppSetting(
        settingKey,
        JSON.stringify(newOrder),
        "json",
        `Tab order settings for ${groupType}`
      );
      return newOrder;
    },
    onSuccess: (newOrder) => {
      queryClient.setQueryData(["tab_order", groupType], newOrder);
      toast.success("Order updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update order");
    },
  });

  const setTabOrder = async (newOrder: string[]) => {
    await updateMutation.mutateAsync(newOrder);
  };

  // Get ordered tabs - returns tabs sorted by saved order, with unsorted tabs at the end
  const getOrderedTabs = <T extends { key?: string; tab_key?: string }>(tabs: T[]): T[] => {
    if (order.length === 0) return tabs;
    
    const getKey = (tab: T) => tab.key || tab.tab_key || "";
    
    return [...tabs].sort((a, b) => {
      const aIndex = order.indexOf(getKey(a));
      const bIndex = order.indexOf(getKey(b));
      
      // If both are in the order array, sort by their order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is in order, a comes first
      if (aIndex !== -1) return -1;
      // If only b is in order, b comes first
      if (bIndex !== -1) return 1;
      // If neither is in order, maintain original order
      return 0;
    });
  };

  return {
    order,
    isLoading,
    setTabOrder,
    getOrderedTabs,
    isUpdating: updateMutation.isPending,
  };
};
