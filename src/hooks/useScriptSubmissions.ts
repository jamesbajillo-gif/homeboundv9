import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { getUserId } from "@/lib/userHistory";
import { VICILeadData } from "@/lib/vici-parser";

export interface ScriptSubmission {
  id?: number;
  script_name: string;
  spiel_id: string; // NOT NULL in DB, but can be empty string for objections
  objection_id?: string | null;
  submission_type: 'spiel' | 'objection';
  alt_text: string;
  alt_order: number;
  submitted_by: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = "tmdebt_script_submissions";

/**
 * Hook to manage script submissions
 */
export const useScriptSubmissions = (scriptName: string, submissionType: 'spiel' | 'objection', leadData: VICILeadData) => {
  const queryClient = useQueryClient();
  const userId = getUserId(leadData);

  // Fetch all approved submissions (globally available)
  const { data: approvedSubmissions = [] } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "submissions", scriptName, "approved"],
    queryFn: async (): Promise<ScriptSubmission[]> => {
      try {
        const data = await mysqlApi.getAll<ScriptSubmission>(
          TABLE_NAME,
          {
            where: {
              script_name: scriptName,
              submission_type: submissionType,
              status: 'approved'
            },
            orderBy: "alt_order",
            order: "ASC"
          }
        );
        return data;
      } catch (error: any) {
        // Silently fail for network/CORS errors - submissions are optional
        if (error.message?.includes('Network error') || error.message?.includes('CORS')) {
          console.warn("Submissions API unavailable (CORS/network issue). Continuing without submissions.");
        } else {
          console.error("Error loading approved submissions:", error);
        }
        return [];
      }
    },
    staleTime: 60000,
  });

  // Fetch user's own submissions (pending and approved)
  const { data: userSubmissions = [] } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "submissions", scriptName, "user", userId],
    queryFn: async (): Promise<ScriptSubmission[]> => {
      if (!userId) return [];
      try {
        const data = await mysqlApi.getAll<ScriptSubmission>(
          TABLE_NAME,
          {
            where: {
              script_name: scriptName,
              submission_type: submissionType,
              submitted_by: userId
            },
            orderBy: "created_at",
            order: "DESC"
          }
        );
        return data;
      } catch (error: any) {
        // Silently fail for network/CORS errors - submissions are optional
        if (error.message?.includes('Network error') || error.message?.includes('CORS')) {
          console.warn("Submissions API unavailable (CORS/network issue). Continuing without submissions.");
        } else {
          console.error("Error loading user submissions:", error);
        }
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // Submit a new script
  const submitMutation = useMutation({
    mutationFn: async (data: {
      spielId?: string;
      objectionId?: string;
      text: string;
      order: number;
    }) => {
      if (!userId) throw new Error("User must be logged in to submit");
      
      try {
        await mysqlApi.create(TABLE_NAME, {
          script_name: scriptName,
          spiel_id: data.spielId || '', // Required field, use empty string if not provided
          objection_id: data.objectionId || null,
          submission_type: submissionType,
          alt_text: data.text,
          alt_order: data.order,
          submitted_by: userId,
          status: 'pending',
        });
      } catch (error: any) {
        // Provide user-friendly error message for CORS/network errors
        if (error.message?.includes('Network error') || error.message?.includes('CORS')) {
          throw new Error("Unable to save script submission. Please check server CORS configuration or contact administrator.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "submissions", scriptName] });
    },
  });

  // Submit a script
  const submitScript = useCallback(
    async (spielIdOrObjectionId: string, text: string, order: number) => {
      if (submissionType === 'spiel') {
        await submitMutation.mutateAsync({ spielId: spielIdOrObjectionId, objectionId: undefined, text, order });
      } else {
        await submitMutation.mutateAsync({ spielId: '', objectionId: spielIdOrObjectionId, text, order });
      }
    },
    [submissionType, submitMutation]
  );

  return {
    approvedSubmissions,
    userSubmissions,
    submitScript,
    isSubmitting: submitMutation.isPending,
  };
};

