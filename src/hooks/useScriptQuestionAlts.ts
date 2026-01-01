import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { useGroup } from "@/contexts/GroupContext";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface ScriptQuestionAlt {
  id?: number;
  script_name: string;
  question_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

const TABLE_NAME = "homebound_script_question_alts";

/**
 * Hook to manage script-specific question alternatives.
 * Alternatives are saved per script (inbound/outbound) and question.
 */
export const useScriptQuestionAlts = () => {
  const { groupType } = useGroup();
  const queryClient = useQueryClient();
  
  const scriptName = groupType === "outbound" ? "outbound_qualification" : "inbound_qualification";

  // Fetch all alternatives for the current script
  const { data: alternatives = [], isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName],
    queryFn: async (): Promise<ScriptQuestionAlt[]> => {
      try {
        const data = await mysqlApi.findByField<ScriptQuestionAlt>(
          TABLE_NAME,
          "script_name",
          scriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
        return data;
      } catch (error) {
        console.error("Error loading script question alternatives:", error);
        return [];
      }
    },
  });

  // Get alternatives for a specific question
  const getAlternativesForQuestion = useCallback(
    (questionId: string): ScriptQuestionAlt[] => {
      return alternatives.filter((alt) => alt.question_id === questionId);
    },
    [alternatives]
  );

  // Save alternative mutation
  const saveMutation = useMutation({
    mutationFn: async (alt: Omit<ScriptQuestionAlt, "id">) => {
      // Try upsert first (requires unique constraint on script_name, question_id, alt_order)
      await mysqlApi.upsertByFields(TABLE_NAME, {
        script_name: alt.script_name,
        question_id: alt.question_id,
        alt_text: alt.alt_text,
        alt_order: alt.alt_order,
        is_default: alt.is_default,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName] });
    },
  });

  // Delete alternative mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ questionId, altOrder }: { questionId: string; altOrder: number }) => {
      await mysqlApi.deleteByWhere(TABLE_NAME, {
        script_name: scriptName,
        question_id: questionId,
        alt_order: altOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName] });
    },
  });

  // Save or update an alternative for a question
  const saveAlternative = useCallback(
    async (questionId: string, text: string, order: number, isDefault = false) => {
      await saveMutation.mutateAsync({
        script_name: scriptName,
        question_id: questionId,
        alt_text: text,
        alt_order: order,
        is_default: isDefault ? 1 : 0,
      });
    },
    [scriptName, saveMutation]
  );

  // Add a new alternative (auto-assigns next order)
  const addAlternative = useCallback(
    async (questionId: string, text: string) => {
      const existing = getAlternativesForQuestion(questionId);
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
      await saveAlternative(questionId, text, nextOrder);
    },
    [getAlternativesForQuestion, saveAlternative]
  );

  // Delete an alternative
  const deleteAlternative = useCallback(
    async (questionId: string, altOrder: number) => {
      await deleteMutation.mutateAsync({ questionId, altOrder });
    },
    [deleteMutation]
  );

  // Delete by ID
  const deleteAlternativeById = useCallback(
    async (id: number) => {
      await mysqlApi.deleteById(TABLE_NAME, id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName] });
    },
    [queryClient, scriptName]
  );

  // Set default alternative for a question (clears other defaults)
  const setDefaultAlternative = useCallback(
    async (questionId: string, altOrder: number) => {
      // First, clear all defaults for this question
      const questionAlts = getAlternativesForQuestion(questionId);
      for (const alt of questionAlts) {
        if (alt.is_default === 1 && alt.alt_order !== altOrder) {
          await mysqlApi.updateById(TABLE_NAME, alt.id!, { is_default: 0 });
        }
      }
      // Set the new default
      const targetAlt = questionAlts.find(a => a.alt_order === altOrder);
      if (targetAlt?.id) {
        await mysqlApi.updateById(TABLE_NAME, targetAlt.id, { is_default: 1 });
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName] });
    },
    [getAlternativesForQuestion, queryClient, scriptName]
  );

  // Clear default for a question
  const clearDefault = useCallback(
    async (questionId: string) => {
      const questionAlts = getAlternativesForQuestion(questionId);
      for (const alt of questionAlts) {
        if (alt.is_default === 1) {
          await mysqlApi.updateById(TABLE_NAME, alt.id!, { is_default: 0 });
        }
      }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName] });
    },
    [getAlternativesForQuestion, queryClient, scriptName]
  );

  return {
    alternatives,
    isLoading,
    scriptName,
    getAlternativesForQuestion,
    saveAlternative,
    addAlternative,
    deleteAlternative,
    deleteAlternativeById,
    setDefaultAlternative,
    clearDefault,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
  };
};
