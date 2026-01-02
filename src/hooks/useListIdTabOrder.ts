import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { toast } from "sonner";

/**
 * Hook to manage tab order settings for a specific List ID.
 * Uses the same pattern as useTabOrder for inbound/outbound.
 */
export const useListIdTabOrder = (listId: string) => {
  const queryClient = useQueryClient();
  const settingKey = `listid_tab_order_${listId}`;

  // Fetch order settings
  const { data: order = [], isLoading } = useQuery({
    queryKey: ["listid_tab_order", listId],
    queryFn: async (): Promise<string[]> => {
      try {
        const data = await getAppSetting(settingKey);
        if (data) {
          return JSON.parse(data);
        }
        return [];
      } catch (error) {
        console.warn("Error loading list ID tab order:", error);
        return [];
      }
    },
    enabled: !!listId,
    staleTime: 60000, // 1 minute - prevents unnecessary refetches
  });

  // Update order
  const updateMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      await setAppSetting(
        settingKey,
        JSON.stringify(newOrder),
        "json",
        `Tab order settings for List ID ${listId}`
      );
      return newOrder;
    },
    onSuccess: (newOrder) => {
      queryClient.setQueryData(["listid_tab_order", listId], newOrder);
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
