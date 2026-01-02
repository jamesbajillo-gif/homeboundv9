import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Check, X, Pencil } from "lucide-react";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useVICI } from "@/contexts/VICIContext";
import { getUserId } from "@/lib/userHistory";
import { SubmissionsList } from "./SubmissionsList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SpielListEditorProps {
  stepName: string;
  stepTitle: string;
  listId?: string; // Optional: If provided, uses list ID config table instead
}

interface ScriptSection {
  id: number | string;
  step_name: string;
  title: string;
  content: string;
  list_id?: string;
  name?: string;
}

interface ListItem {
  id: string;
  text: string;
  type: 'spiel' | 'alternative';
  spielId?: string;
  altOrder?: number;
}

interface SpielAlternative {
  id?: number;
  script_name: string;
  spiel_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

const ALTS_TABLE = "homebound_spiel_alts";

export const SpielListEditor = ({ stepName, stepTitle, listId }: SpielListEditorProps) => {
  const queryClient = useQueryClient();
  const { leadData } = useVICI();
  const currentUserId = getUserId(leadData);
  const isStandardUser = currentUserId === '001'; // Hide edit/delete for standard user
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ListItem | null>(null);

  // Determine which table and query key to use
  const tableName = listId ? "homebound_list_id_config" : "homebound_script";
  const queryKey = listId 
    ? ["list-script", listId, stepName] 
    : QUERY_KEYS.scripts.byStep(stepName);
  // Build script name for alternatives - check if stepName already has listid prefix to avoid double-prefixing
  const altsScriptName = listId 
    ? (stepName.startsWith('listid_') ? stepName : `listid_${listId}_${stepName}`)
    : stepName;

  // Fetch script using React Query
  const { data: section, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (listId) {
        // List ID specific script
        const data = await mysqlApi.findOneByFields<ScriptSection>(
          tableName,
          { list_id: listId, step_name: stepName }
        );
        return data;
      } else {
        // Default script
        const data = await mysqlApi.findOneByField<ScriptSection>(
          tableName,
          "step_name",
          stepName
        );
        return data;
      }
    },
    enabled: !!stepName,
  });

  // Fetch alternatives
  const { data: alternatives = [], isLoading: altsLoading } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", altsScriptName],
    queryFn: async (): Promise<SpielAlternative[]> => {
      try {
        const data = await mysqlApi.findByField<SpielAlternative>(
          ALTS_TABLE,
          "script_name",
          altsScriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
        return data;
      } catch (error) {
        console.error("Error loading spiel alternatives:", error);
        return [];
      }
    },
  });

  // Save alternative mutation
  const saveAltMutation = useMutation({
    mutationFn: async (alt: Omit<SpielAlternative, "id">) => {
      await mysqlApi.upsertByFields(ALTS_TABLE, {
        script_name: alt.script_name,
        spiel_id: alt.spiel_id,
        alt_text: alt.alt_text,
        alt_order: alt.alt_order,
        is_default: alt.is_default,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", altsScriptName] });
    },
  });

  // Delete alternative mutation
  const deleteAltMutation = useMutation({
    mutationFn: async ({ spielId, altOrder }: { spielId: string; altOrder: number }) => {
      await mysqlApi.deleteByWhere(ALTS_TABLE, {
        script_name: altsScriptName,
        spiel_id: spielId,
        alt_order: altOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "spiel_alts", altsScriptName] });
    },
  });

  // Parse content into flat list items
  const parseToItems = (content: string, alts: SpielAlternative[]): ListItem[] => {
    const result: ListItem[] = [];
    
    if (content && content.trim()) {
      result.push({
        id: 'spiel_0',
        text: content.trim(),
        type: 'spiel',
        spielId: 'spiel_0',
      });
    }

    alts.forEach((alt) => {
      result.push({
        id: `alt_${alt.spiel_id}_${alt.alt_order}`,
        text: alt.alt_text,
        type: 'alternative',
        spielId: alt.spiel_id,
        altOrder: alt.alt_order,
      });
    });

    return result;
  };

  useEffect(() => {
    if (section || alternatives.length > 0) {
      setItems(parseToItems(section?.content || '', alternatives));
    }
  }, [section, alternatives]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const spielItem = items.find(i => i.type === 'spiel');
      const content = spielItem?.text || '';
      
      if (listId) {
        // Save to list ID config table
        const existingConfig = await mysqlApi.findOneByFields<{ name: string }>(
          "homebound_list_id_config",
          { list_id: listId }
        );
        
        await mysqlApi.upsertByFields("homebound_list_id_config", {
          list_id: listId,
          step_name: stepName,
          title: stepTitle,
          content,
          name: existingConfig?.name || listId,
        }, "list_id,step_name");
      } else {
        // Save to default script table
        await mysqlApi.upsertByFields("homebound_script", {
          step_name: stepName,
          title: stepTitle,
          content,
          button_config: JSON.stringify([]),
        });
      }

      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
      queryClient.invalidateQueries({ queryKey: ['scripts', 'display'] });
      toast.success("Saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: ListItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = async (item: ListItem) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    if (item.type === 'alternative' && item.spielId && item.altOrder !== undefined) {
      await saveAltMutation.mutateAsync({
        script_name: altsScriptName,
        spiel_id: item.spielId,
        alt_text: editText.trim(),
        alt_order: item.altOrder,
        is_default: 0,
      });
    } else {
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, text: editText.trim() } : i
      ));
    }
    
    setEditingId(null);
    setEditText("");
  };

  const handleDeleteClick = (item: ListItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'alternative' && deleteTarget.spielId && deleteTarget.altOrder !== undefined) {
      await deleteAltMutation.mutateAsync({
        spielId: deleteTarget.spielId,
        altOrder: deleteTarget.altOrder,
      });
      toast.success("Alternative deleted");
    }
    setDeleteTarget(null);
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    
    const baseSpiel = items.find(i => i.type === 'spiel');
    
    if (baseSpiel) {
      const existingAlts = alternatives.filter(a => a.spiel_id === baseSpiel.spielId);
      const nextOrder = existingAlts.length > 0 ? Math.max(...existingAlts.map(a => a.alt_order)) + 1 : 1;
      
      await saveAltMutation.mutateAsync({
        script_name: altsScriptName,
        spiel_id: baseSpiel.spielId!,
        alt_text: newText.trim(),
        alt_order: nextOrder,
        is_default: 0,
      });
    } else {
      setItems(prev => [...prev, {
        id: 'spiel_0',
        text: newText.trim(),
        type: 'spiel',
        spielId: 'spiel_0',
      }]);
    }
    
    setNewText("");
    setIsAdding(false);
  };

  if (isLoading || altsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{stepTitle}</h2>
        <div className="flex gap-2">
          {/* Add button - hidden for standard user (001) */}
          {!isStandardUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
          {/* Save button - hidden for standard user (001) */}
          {!isStandardUser && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="flex gap-2 mb-3">
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter spiel text..."
            className="flex-1 min-h-[80px]"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={handleAdd} disabled={!newText.trim()}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items yet. Click "Add" to create one.
          </p>
        )}
        
        {items.map((item, index) => (
          <div 
            key={item.id}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors group"
          >
            {editingId === item.id ? (
              <div className="flex-1 flex gap-2">
                <span className="text-sm font-medium text-muted-foreground shrink-0 mt-2">
                  #{index + 1}
                </span>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 text-sm min-h-[80px]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={() => handleSaveEdit(item)}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-muted-foreground shrink-0">
                  #{index + 1}
                </span>
                <pre className="flex-1 text-sm whitespace-pre-wrap font-sans">{item.text}</pre>
                {/* Edit and delete buttons - hidden for standard user (001) */}
                {!isStandardUser && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleStartEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {item.type === 'alternative' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteClick(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alternative?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The alternative spiel will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    
    {/* Pending Submissions - only shown for admin */}
    <SubmissionsList 
      scriptName={altsScriptName}
      submissionType="spiel"
      stepTitle={stepTitle}
    />
  </>
  );
};
