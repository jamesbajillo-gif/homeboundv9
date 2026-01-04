import { useQuery } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";

interface ListIdConfig {
  list_id: string;
  name: string;
}

/**
 * Hook to fetch all configured List IDs from the database.
 * This is used to validate if a list ID exists before attempting to load its scripts.
 * Cached for 5 minutes to reduce API calls.
 */
export const useConfiguredListIds = () => {
  const { data: listIds = [], isLoading, error } = useQuery<ListIdConfig[]>({
    queryKey: ["configured-list-ids"],
    queryFn: async () => {
      const data = await mysqlApi.getAll<{ list_id: string; name: string }>(
        "tmdebt_list_id_config",
        {
          fields: ["list_id", "name"],
          orderBy: "list_id",
          order: "ASC"
        }
      );
      
      // Get unique list_ids (deduplicate by list_id)
      const unique = data.reduce((acc, curr) => {
        if (!acc.find(item => item.list_id === curr.list_id)) {
          acc.push(curr);
        }
        return acc;
      }, [] as ListIdConfig[]);
      
      return unique;
    },
    staleTime: 300000, // 5 minutes - list IDs don't change frequently
    cacheTime: 600000, // 10 minutes - keep in cache longer
    retry: 2,
  });

  /**
   * Check if a list ID exists in the configured list
   */
  const isListIdConfigured = (listId: string | null | undefined): boolean => {
    if (!listId) return false;
    return listIds.some(config => config.list_id === listId);
  };

  /**
   * Get the name for a list ID
   */
  const getListIdName = (listId: string | null | undefined): string | null => {
    if (!listId) return null;
    const config = listIds.find(c => c.list_id === listId);
    return config?.name || null;
  };

  return {
    listIds,
    isLoading,
    error,
    isListIdConfigured,
    getListIdName,
  };
};

