import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Check, X, RefreshCw, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ObjectionListEditorProps {
  stepName: string;
  stepTitle: string;
}

interface ScriptSection {
  id: number | string;
  step_name: string;
  title: string;
  content: string;
}

interface Objection {
  id: string;
  title: string;
  response: string;
}

interface ObjectionAlternative {
  id?: number;
  script_name: string;
  objection_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

const ALTS_TABLE = "homebound_objection_alts";

export const ObjectionListEditor = ({ stepName, stepTitle }: ObjectionListEditorProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Alternative editing state
  const [addingAltToId, setAddingAltToId] = useState<string | null>(null);
  const [newAltText, setNewAltText] = useState("");
  const [editingAltKey, setEditingAltKey] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive script name for alternatives
  const altScriptName = stepName === "outbound_objection" 
    ? "outbound_objection" 
    : "inbound_objection";

  // Fetch script using React Query
  const { data: section, isLoading } = useQuery({
    queryKey: QUERY_KEYS.scripts.byStep(stepName),
    queryFn: async () => {
      const data = await mysqlApi.findOneByField<ScriptSection>(
        "homebound_script",
        "step_name",
        stepName
      );
      return data;
    },
    enabled: !!stepName,
  });

  // Fetch alternatives
  const { data: alternatives = [], isLoading: altsLoading } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "objection_alts", altScriptName],
    queryFn: async (): Promise<ObjectionAlternative[]> => {
      try {
        const data = await mysqlApi.findByField<ObjectionAlternative>(
          ALTS_TABLE,
          "script_name",
          altScriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
        return data;
      } catch (error) {
        console.error("Error loading objection alternatives:", error);
        return [];
      }
    },
  });

  // Get alternatives for a specific objection
  const getAlternativesForObjection = useCallback(
    (objectionId: string): ObjectionAlternative[] => {
      return alternatives.filter((alt) => alt.objection_id === objectionId);
    },
    [alternatives]
  );

  // Save alternative mutation
  const saveAltMutation = useMutation({
    mutationFn: async (alt: Omit<ObjectionAlternative, "id">) => {
      await mysqlApi.upsertByFields(ALTS_TABLE, {
        script_name: alt.script_name,
        objection_id: alt.objection_id,
        alt_text: alt.alt_text,
        alt_order: alt.alt_order,
        is_default: alt.is_default,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "objection_alts", altScriptName] });
    },
  });

  // Delete alternative mutation
  const deleteAltMutation = useMutation({
    mutationFn: async ({ objectionId, altOrder }: { objectionId: string; altOrder: number }) => {
      await mysqlApi.deleteByWhere(ALTS_TABLE, {
        script_name: altScriptName,
        objection_id: objectionId,
        alt_order: altOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.scripts.all, "objection_alts", altScriptName] });
    },
  });

  const isSavingAlt = saveAltMutation.isPending || deleteAltMutation.isPending;

  // Parse objections from content
  const parseObjections = (content: string, showLegacyToast = false): Objection[] => {
    if (!content || content.trim() === '') return [];
    
    const lines = content.split('\n');
    const parsed: Objection[] = [];
    let currentObjection: Partial<Objection> | null = null;
    let responseLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
      
      if (boldMatch) {
        if (currentObjection?.title) {
          parsed.push({
            id: `obj_${parsed.length}`,
            title: currentObjection.title,
            response: responseLines.join('\n').trim(),
          });
        }
        currentObjection = { title: boldMatch[1] };
        responseLines = [];
      } else if (currentObjection && trimmed) {
        responseLines.push(trimmed);
      }
    });

    if (currentObjection?.title) {
      parsed.push({
        id: `obj_${parsed.length}`,
        title: currentObjection.title,
        response: responseLines.join('\n').trim(),
      });
    }

    // Fallback: If no structured objections found but content exists,
    // treat entire content as a single objection (legacy format support)
    if (parsed.length === 0 && content.trim()) {
      parsed.push({
        id: `obj_0`,
        title: `Objection 1`,
        response: content.trim()
      });
      
      if (showLegacyToast) {
        toast.info("Legacy format detected. Review and click 'Save All' to update.");
      }
    }

    return parsed;
  };

  // Convert objections back to content format
  const objectionsToContent = (objs: Objection[]): string => {
    return objs.map(obj => `**${obj.title}**\n${obj.response}`).join('\n\n');
  };

  useEffect(() => {
    if (section) {
      setObjections(parseObjections(section.content, true));
    }
  }, [section]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const content = objectionsToContent(objections);
      
      const existingData = await mysqlApi.findOneByField<ScriptSection>(
        "homebound_script",
        "step_name",
        stepName
      );

      if (existingData) {
        await mysqlApi.updateByField(
          "homebound_script",
          "step_name",
          stepName,
          { title: stepTitle, content }
        );
      } else {
        await mysqlApi.create("homebound_script", {
          step_name: stepName,
          title: stepTitle,
          content,
          button_config: [],
        });
      }

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.byStep(stepName) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scripts.all });
      queryClient.invalidateQueries({ queryKey: ['scripts', 'display'] });
      toast.success("Objections saved!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (obj: Objection) => {
    setEditingId(obj.id);
    setEditTitle(obj.title);
    setEditResponse(obj.response);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    
    setObjections(prev => prev.map(obj => 
      obj.id === editingId 
        ? { ...obj, title: editTitle.trim(), response: editResponse.trim() }
        : obj
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setObjections(prev => prev.filter(obj => obj.id !== id));
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    
    setObjections(prev => [
      ...prev,
      {
        id: `obj_${Date.now()}`,
        title: newTitle.trim(),
        response: newResponse.trim(),
      }
    ]);
    setNewTitle("");
    setNewResponse("");
    setIsAdding(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Alternative handlers
  const handleAddAlternative = async (objectionId: string) => {
    if (!newAltText.trim()) {
      setAddingAltToId(null);
      return;
    }

    const existing = getAlternativesForObjection(objectionId);
    const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
    
    await saveAltMutation.mutateAsync({
      script_name: altScriptName,
      objection_id: objectionId,
      alt_text: newAltText.trim(),
      alt_order: nextOrder,
      is_default: 0,
    });

    setAddingAltToId(null);
    setNewAltText("");
    toast.success("Alternative added");
  };

  const handleSaveAltEdit = async (alt: ObjectionAlternative) => {
    if (!editAltText.trim()) {
      setEditingAltKey(null);
      return;
    }

    await saveAltMutation.mutateAsync({
      script_name: alt.script_name,
      objection_id: alt.objection_id,
      alt_text: editAltText.trim(),
      alt_order: alt.alt_order,
      is_default: alt.is_default,
    });

    setEditingAltKey(null);
    setEditAltText("");
    toast.success("Alternative updated");
  };

  const handleDeleteAlternative = async (alt: ObjectionAlternative) => {
    await deleteAltMutation.mutateAsync({ 
      objectionId: alt.objection_id, 
      altOrder: alt.alt_order 
    });
    toast.success("Alternative deleted");
  };

  if (isLoading || altsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{stepTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Manage objections and their alternative responses.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Objection
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save All
            </Button>
          </div>
        </div>

        {/* Add new objection form */}
        {isAdding && (
          <div className="border rounded-lg p-3 mb-3 bg-muted/30 space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Objection title (e.g., 'I'm not interested')"
              className="font-medium"
              autoFocus
            />
            <Input
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder="Response script..."
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Unified objections list */}
        <div className="space-y-2">
          {objections.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No objections yet. Click "Add Objection" to create one.
            </p>
          )}
          
          {objections.map((obj, index) => {
            const alts = getAlternativesForObjection(obj.id);
            const isExpanded = expandedIds.has(obj.id);
            const isAddingAlt = addingAltToId === obj.id;

            return (
              <Collapsible 
                key={obj.id} 
                open={isExpanded}
                onOpenChange={() => toggleExpanded(obj.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  {editingId === obj.id ? (
                    <div className="p-3 space-y-2 bg-muted/30">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Objection title"
                        className="font-medium text-sm"
                        autoFocus
                      />
                      <Input
                        value={editResponse}
                        onChange={(e) => setEditResponse(e.target.value)}
                        placeholder="Response"
                        className="text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors group">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground font-mono w-5">
                            {index + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{obj.title}</p>
                              {alts.length > 0 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{alts.length} alt{alts.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{obj.response}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(obj);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit objection</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(obj.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete objection</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/20 p-3 space-y-2">
                          {/* Original response */}
                          <div className="border-l-2 border-primary/50 pl-3 py-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">Original</Badge>
                            </div>
                            <p className="text-sm text-foreground">{obj.response}</p>
                          </div>

                          {/* Alternatives */}
                          {alts.map((alt) => {
                            const altKey = `${alt.objection_id}_${alt.alt_order}`;
                            const isEditingThis = editingAltKey === altKey;

                            return (
                              <div 
                                key={altKey}
                                className="border-l-2 border-amber-500/50 pl-3 py-1 group/alt"
                              >
                              <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-[10px]">#{alt.alt_order}</Badge>
                              </div>
                                {isEditingThis ? (
                                  <div className="flex gap-2">
                                    <Input
                                      ref={inputRef}
                                      value={editAltText}
                                      onChange={(e) => setEditAltText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveAltEdit(alt);
                                        if (e.key === 'Escape') setEditingAltKey(null);
                                      }}
                                      className="flex-1 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleSaveAltEdit(alt)}
                                      disabled={isSavingAlt}
                                    >
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingAltKey(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <p className="text-sm text-foreground flex-1">{alt.alt_text}</p>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/alt:opacity-100 transition-opacity">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6"
                                            onClick={() => {
                                              setEditingAltKey(altKey);
                                              setEditAltText(alt.alt_text);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit alternative</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-destructive"
                                            onClick={() => handleDeleteAlternative(alt)}
                                            disabled={isSavingAlt}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete alternative</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add alternative form */}
                          {isAddingAlt ? (
                            <div className="flex gap-2 mt-2">
                              <Input
                                value={newAltText}
                                onChange={(e) => setNewAltText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddAlternative(obj.id);
                                  if (e.key === 'Escape') setAddingAltToId(null);
                                }}
                                placeholder="Enter alternative response..."
                                className="flex-1 text-sm"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleAddAlternative(obj.id)}
                                disabled={isSavingAlt || !newAltText.trim()}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setAddingAltToId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1"
                              onClick={() => {
                                setAddingAltToId(obj.id);
                                setNewAltText("");
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add Alternative
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </>
                  )}
                </div>
              </Collapsible>
            );
          })}
        </div>
      </Card>
    </TooltipProvider>
  );
};
