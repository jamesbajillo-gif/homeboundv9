import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { useVICI } from "@/contexts/VICIContext";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface ObjectionAlternative {
  id?: number;
  script_name: string;
  objection_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

const TABLE_NAME = "tmdebt_objection_alts";

/**
 * Hook to manage objection handling alternatives.
 * Alternatives are saved per script (inbound/outbound/listid) and objection.
 * 
 * Priority: List ID > Campaign (stepName should already have prefix if needed)
 * If no list ID alternatives exist, falls back to campaign alternatives.
 */
export const useObjectionAlternatives = (stepName: string) => {
  const { leadData } = useVICI();
  const queryClient = useQueryClient();
  
  // Determine script name based on context
  const viciListId = leadData?.list_id;
  const hasValidListId = viciListId && !viciListId.includes('--A--');
  
  // Already prefixed - use as-is
  const alreadyPrefixed = stepName.startsWith('listid_');
  
  // Build potential script names for priority checking
  const listIdScriptName = hasValidListId ? `listid_${viciListId}_${stepName}` : null;
  const campaignScriptName = stepName; // stepName should already have outbound_ prefix if needed
  
  // Fetch list ID alternatives first (to check if they exist)
  const { data: listIdAlternatives = [] } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "objection_alts", "listid_check", listIdScriptName],
    queryFn: async (): Promise<ObjectionAlternative[]> => {
      if (!listIdScriptName) return [];
      try {
        return await mysqlApi.findByField<ObjectionAlternative>(
          TABLE_NAME,
          "script_name",
          listIdScriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
      } catch (error) {
        return [];
      }
    },
    enabled: !!listIdScriptName && !alreadyPrefixed,
    staleTime: 60000,
  });
  
  // Determine which script name to use based on priority:
  // 1. If stepName is already prefixed with listid_, use it as-is
  // 2. If list ID alternatives exist, use list ID script name
  // 3. Otherwise fall back to campaign script name
  const scriptName = alreadyPrefixed
    ? stepName
    : (listIdScriptName && listIdAlternatives.length > 0)
      ? listIdScriptName
      : campaignScriptName;

  // Fetch all alternatives for the determined script
  const { data: alternatives = [], isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "objection_alts", scriptName],
    queryFn: async (): Promise<ObjectionAlternative[]> => {
      try {
        const data = await mysqlApi.findByField<ObjectionAlternative>(
          TABLE_NAME,
          "script_name",
          scriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
        return data;
      } catch (error) {
        console.error("Error loading objection alternatives:", error);
        return [];
      }
    },
    staleTime: 60000, // 1 minute - prevents unnecessary refetches
  });

  // Get alternatives for a specific objection
  const getAlternativesForObjection = useCallback(
    (objectionId: string): ObjectionAlternative[] => {
      return alternatives.filter((alt) => alt.objection_id === objectionId);
    },
    [alternatives]
  );

  // Save alternative mutation
  const saveMutation = useMutation({
    mutationFn: async (alt: Omit<ObjectionAlternative, "id">) => {
      await mysqlApi.upsertByFields(TABLE_NAME, {
        script_name: alt.script_name,
        objection_id: alt.objection_id,
        alt_text: alt.alt_text,
        alt_order: alt.alt_order,
        is_default: alt.is_default,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "objection_alts", scriptName] });
    },
  });

  // Delete alternative mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ objectionId, altOrder }: { objectionId: string; altOrder: number }) => {
      await mysqlApi.deleteByWhere(TABLE_NAME, {
        script_name: scriptName,
        objection_id: objectionId,
        alt_order: altOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "objection_alts", scriptName] });
    },
  });

  // Save or update an alternative for an objection
  const saveAlternative = useCallback(
    async (objectionId: string, text: string, order: number, isDefault = false) => {
      await saveMutation.mutateAsync({
        script_name: scriptName,
        objection_id: objectionId,
        alt_text: text,
        alt_order: order,
        is_default: isDefault ? 1 : 0,
      });
    },
    [scriptName, saveMutation]
  );

  // Add a new alternative (auto-assigns next order)
  const addAlternative = useCallback(
    async (objectionId: string, text: string) => {
      const existing = getAlternativesForObjection(objectionId);
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
      await saveAlternative(objectionId, text, nextOrder);
    },
    [getAlternativesForObjection, saveAlternative]
  );

  // Delete an alternative
  const deleteAlternative = useCallback(
    async (objectionId: string, altOrder: number) => {
      await deleteMutation.mutateAsync({ objectionId, altOrder });
    },
    [deleteMutation]
  );

  return {
    alternatives,
    isLoading,
    scriptName,
    getAlternativesForObjection,
    saveAlternative,
    addAlternative,
    deleteAlternative,
    isSaving: saveMutation.isPending,
    refetch,
  };
};
