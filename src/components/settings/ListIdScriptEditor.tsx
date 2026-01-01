import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { mysqlApi } from "@/lib/mysqlApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

interface ListIdScriptEditorProps {
  listId: string;
  stepName: string;
  stepTitle: string;
}

interface ScriptData {
  id: number | string;
  list_id: string;
  step_name: string;
  title: string;
  content: string;
}

export const ListIdScriptEditor = ({ listId, stepName, stepTitle }: ListIdScriptEditorProps) => {
  const queryClient = useQueryClient();

  // Fetch script for this specific list_id and step_name
  const { data: scriptData, isLoading } = useQuery({
    queryKey: ["list-script", listId, stepName],
    queryFn: async () => {
      const data = await mysqlApi.findOneByFields<ScriptData>(
        "homebound_list_id_config",
        {
          list_id: listId,
          step_name: stepName
        }
      );
      return data;
    },
    enabled: !!listId && !!stepName,
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Update local state when data loads
  useEffect(() => {
    if (scriptData) {
      setTitle(scriptData.title);
      setContent(scriptData.content);
    } else {
      setTitle(stepTitle);
      setContent("");
    }
  }, [scriptData, stepTitle]);

  // Save mutation (insert or update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Fetch existing name to include in payload (required for new inserts)
      // This ensures the database constraint is satisfied without overwriting the description
      const existingRecord = await mysqlApi.findOneByFields<{ name: string }>(
        "homebound_list_id_config",
        { list_id: listId }
      );

      const payload = {
        list_id: listId,
        step_name: stepName,
        title,
        content,
        name: existingRecord?.name || listId, // Required field - use existing value
      };

      await mysqlApi.upsertByFields(
        "homebound_list_id_config",
        payload,
        "list_id,step_name"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-script", listId, stepName] });
      toast.success("Script saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save script");
    },
  });

  const handleReset = () => {
    if (scriptData) {
      setTitle(scriptData.title);
      setContent(scriptData.content);
      toast.info("Changes reset");
    } else {
      setTitle(stepTitle);
      setContent("");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isNew = !scriptData;

  return (
    <Card className={isNew ? "border-amber-500/50" : ""}>
      <CardHeader>
        <div className="flex items-start gap-3">
          {isNew && <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />}
          <div className="flex-1">
            <CardTitle className="text-xl">
              {stepTitle}
            </CardTitle>
            <CardDescription>
              {isNew 
                ? `This script hasn't been created yet for ${listId}`
                : `Configure the ${stepName} script for ${listId}`
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="script-title">Section Title</Label>
          <Input
            id="script-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter section title..."
            className="font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="script-content">Script Content</Label>
          <Textarea
            id="script-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter script content for ${stepName}...`}
            rows={16}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!title || !content || saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : isNew ? "Create Script" : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saveMutation.isPending}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
