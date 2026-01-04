import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { useVICI } from "@/contexts/VICIContext";
import { getUserId } from "@/lib/userHistory";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { isManagerUserSync } from "@/lib/managerUtils";

interface SubmissionsListProps {
  scriptName: string;
  submissionType: 'spiel' | 'objection';
  stepTitle: string;
}

interface ScriptSubmission {
  id?: number;
  script_name: string;
  spiel_id: string;
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
}

const TABLE_NAME = "tmdebt_script_submissions";

// Helper function to format date as MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
const formatMySQLDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const SubmissionsList = ({ scriptName, submissionType, stepTitle }: SubmissionsListProps) => {
  const { leadData } = useVICI();
  const queryClient = useQueryClient();
  const currentUserId = getUserId(leadData);
  const isAdmin = currentUserId === '000';
  const isManager = isManagerUserSync(currentUserId);
  const canApprove = isAdmin || isManager; // Both admin and manager can approve

  // Fetch pending submissions for this script
  const { data: pendingSubmissions = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "submissions", scriptName, "pending"],
    queryFn: async (): Promise<ScriptSubmission[]> => {
      try {
        const data = await mysqlApi.getAll<ScriptSubmission>(
          TABLE_NAME,
          {
            where: {
              script_name: scriptName,
              submission_type: submissionType,
              status: 'pending'
            },
            orderBy: "created_at",
            order: "DESC"
          }
        );
        return data;
      } catch (error: any) {
        if (error.message?.includes('Network error') || error.message?.includes('CORS')) {
          console.warn("Submissions API unavailable (CORS/network issue).");
        } else {
          console.error("Error loading pending submissions:", error);
        }
        return [];
      }
    },
    enabled: !!scriptName && canApprove, // Only fetch for admin/manager
    staleTime: 30000,
  });

  // Approve submission mutation
  const approveMutation = useMutation({
    mutationFn: async (submission: ScriptSubmission) => {
      if (!currentUserId || !canApprove) {
        throw new Error("Only admin or manager can approve submissions");
      }
      
      if (!submission.id) {
        throw new Error("Invalid submission ID");
      }

      // Determine which alternatives table to use
      const altsTable = submissionType === 'spiel' 
        ? 'tmdebt_spiel_alts' 
        : 'tmdebt_objection_alts';
      
      // Get the item ID (spiel_id or objection_id)
      const itemId = submissionType === 'spiel' 
        ? submission.spiel_id 
        : submission.objection_id || 'objection_0';
      
      // Add to alternatives table - this makes it permanently available globally
      await mysqlApi.upsertByFields(altsTable, {
        script_name: submission.script_name,
        ...(submissionType === 'spiel' 
          ? { spiel_id: itemId }
          : { objection_id: itemId }),
        alt_text: submission.alt_text,
        alt_order: submission.alt_order,
        is_default: 0, // Not set as default automatically
      });
      
      // Update submission status to approved
      await mysqlApi.updateById(TABLE_NAME, submission.id, {
        status: 'approved',
        approved_by: currentUserId,
        approved_at: formatMySQLDateTime(new Date()),
      });
    },
    onSuccess: () => {
      // Invalidate both submissions and alternatives queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "submissions", scriptName] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, `${submissionType}_alts`, scriptName] });
      toast.success("Submission approved and added globally");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve submission");
    },
  });

  // Reject submission mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: number; reason?: string }) => {
      if (!currentUserId || !canApprove) {
        throw new Error("Only admin or manager can reject submissions");
      }
      
      await mysqlApi.updateById(TABLE_NAME, submissionId, {
        status: 'rejected',
        approved_by: currentUserId,
        approved_at: formatMySQLDateTime(new Date()),
        rejection_reason: reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "submissions", scriptName] });
      toast.success("Submission rejected");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject submission");
    },
  });

  const handleApprove = (submission: ScriptSubmission) => {
    approveMutation.mutate(submission);
  };

  const handleReject = (submissionId: number) => {
    if (window.confirm("Reject this submission? This action cannot be undone.")) {
      rejectMutation.mutate({ submissionId });
    }
  };

  // Don't show anything if not admin/manager or no pending submissions
  if (!canApprove) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingSubmissions.length === 0) {
    return null; // Don't show card if no pending submissions
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Submissions ({pendingSubmissions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingSubmissions.map((submission) => (
          <div key={submission.id} className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Submitted by {submission.submitted_by}
                  </Badge>
                  {submission.created_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/50 p-3 rounded-md border">
                  {submission.alt_text}
                </pre>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(submission)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(submission.id!)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
            {submission.id !== pendingSubmissions[pendingSubmissions.length - 1]?.id && (
              <Separator />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

