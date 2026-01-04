import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { useGroup } from "@/contexts/GroupContext";
import { useVICI } from "@/contexts/VICIContext";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface SpielAlternative {
  id?: number;
  script_name: string;
  spiel_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

const TABLE_NAME = "tmdebt_spiel_alts";

/**
 * Hook to manage spiel alternatives for greeting and closing scripts.
 * Alternatives are saved per script (inbound/outbound/listid) and spiel.
 * 
 * Priority: List ID > Campaign (outbound/inbound)
 * If no list ID alternatives exist, falls back to campaign alternatives.
 */
export const useSpielAlternatives = (stepName: string) => {
  const { groupType } = useGroup();
  const { leadData } = useVICI();
  const queryClient = useQueryClient();
  
  // Determine script name based on context
  const viciListId = leadData?.list_id;
  const hasValidListId = viciListId && !viciListId.includes('--A--');
  
  // Build potential script names for priority checking
  const listIdScriptName = hasValidListId ? `listid_${viciListId}_${stepName}` : null;
  const campaignScriptName = stepName.startsWith('outbound_')
    ? stepName
    : groupType === "outbound"
      ? `outbound_${stepName}`
      : stepName;
  
  // Already prefixed - use as-is
  const alreadyPrefixed = stepName.startsWith('listid_') || stepName.startsWith('outbound_');
  
  // Fetch list ID alternatives first (to check if they exist)
  const { data: listIdAlternatives = [] } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", "listid_check", listIdScriptName],
    queryFn: async (): Promise<SpielAlternative[]> => {
      if (!listIdScriptName) return [];
      try {
        return await mysqlApi.findByField<SpielAlternative>(
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
  // 1. If stepName is already prefixed, use it as-is
  // 2. If list ID alternatives exist, use list ID script name
  // 3. Otherwise fall back to campaign script name
  const scriptName = alreadyPrefixed
    ? stepName
    : (listIdScriptName && listIdAlternatives.length > 0)
      ? listIdScriptName
      : campaignScriptName;

  // Fetch all alternatives for the determined script
  const { data: alternatives = [], isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", scriptName],
    queryFn: async (): Promise<SpielAlternative[]> => {
      try {
        const data = await mysqlApi.findByField<SpielAlternative>(
          TABLE_NAME,
          "script_name",
          scriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
        return data;
      } catch (error) {
        console.error("Error loading spiel alternatives:", error);
        return [];
      }
    },
    staleTime: 60000, // 1 minute - prevents unnecessary refetches
  });

  // Get alternatives for a specific spiel
  const getAlternativesForSpiel = useCallback(
    (spielId: string): SpielAlternative[] => {
      return alternatives.filter((alt) => alt.spiel_id === spielId);
    },
    [alternatives]
  );

  // Save alternative mutation
  const saveMutation = useMutation({
    mutationFn: async (alt: Omit<SpielAlternative, "id">) => {
      await mysqlApi.upsertByFields(TABLE_NAME, {
        script_name: alt.script_name,
        spiel_id: alt.spiel_id,
        alt_text: alt.alt_text,
        alt_order: alt.alt_order,
        is_default: alt.is_default,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", scriptName] });
    },
  });

  // Delete alternative mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ spielId, altOrder }: { spielId: string; altOrder: number }) => {
      await mysqlApi.deleteByWhere(TABLE_NAME, {
        script_name: scriptName,
        spiel_id: spielId,
        alt_order: altOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", scriptName] });
    },
  });

  // Save or update an alternative for a spiel
  const saveAlternative = useCallback(
    async (spielId: string, text: string, order: number, isDefault = false) => {
      await saveMutation.mutateAsync({
        script_name: scriptName,
        spiel_id: spielId,
        alt_text: text,
        alt_order: order,
        is_default: isDefault ? 1 : 0,
      });
    },
    [scriptName, saveMutation]
  );

  // Add a new alternative (auto-assigns next order)
  const addAlternative = useCallback(
    async (spielId: string, text: string) => {
      const existing = getAlternativesForSpiel(spielId);
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
      await saveAlternative(spielId, text, nextOrder);
    },
    [getAlternativesForSpiel, saveAlternative]
  );

  // Delete an alternative
  const deleteAlternative = useCallback(
    async (spielId: string, altOrder: number) => {
      await deleteMutation.mutateAsync({ spielId, altOrder });
    },
    [deleteMutation]
  );

  return {
    alternatives,
    isLoading,
    scriptName,
    getAlternativesForSpiel,
    saveAlternative,
    addAlternative,
    deleteAlternative,
    isSaving: saveMutation.isPending,
    refetch,
  };
};

