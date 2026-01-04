import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RefreshCw, Plus, Check, X, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ObjectionAlternativesEditorProps {
  scriptName: string; // e.g., "inbound_objection", "outbound_objection", or "listid_123"
  scriptContent: string;
}

interface ObjectionAlternative {
  id?: number;
  script_name: string;
  objection_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

interface ParsedObjection {
  id: string;
  title: string;
  response: string;
  lineIndex: number;
}

const TABLE_NAME = "tmdebt_objection_alts";

export const ObjectionAlternativesEditor = ({ 
  scriptName, 
  scriptContent 
}: ObjectionAlternativesEditorProps) => {
  const queryClient = useQueryClient();
  const [currentAltIndexes, setCurrentAltIndexes] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newAltText, setNewAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch alternatives for this specific script
  const { data: alternatives = [], isLoading } = useQuery({
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
  });

  // Get alternatives for a specific objection
  const getAlternativesForObjection = useCallback(
    (objectionId: string): ObjectionAlternative[] => {
      return alternatives.filter((alt) => alt.objection_id === objectionId);
    },
    [alternatives]
  );

  // Save mutation
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

  // Delete mutation
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

  const isSaving = saveMutation.isPending || deleteMutation.isPending;

  // Parse objections from script content
  const parseObjections = useCallback((rawContent: string): ParsedObjection[] => {
    const lines = rawContent.split('\n');
    const objections: ParsedObjection[] = [];
    let currentObjection: Partial<ParsedObjection> | null = null;
    let responseLines: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
      const numberedMatch = trimmed.match(/^(\d+[\.\)]\s*)(.+)$/);
      
      if (boldMatch || (numberedMatch && trimmed.length < 100)) {
        if (currentObjection?.title) {
          objections.push({
            id: `objection_${objections.length}`,
            title: currentObjection.title,
            response: responseLines.join('\n').trim(),
            lineIndex: currentObjection.lineIndex || 0,
          });
        }
        
        currentObjection = {
          title: boldMatch ? boldMatch[1] : (numberedMatch ? numberedMatch[2] : trimmed),
          lineIndex: index,
        };
        responseLines = [];
      } else if (currentObjection && trimmed) {
        responseLines.push(trimmed);
      }
    });

    if (currentObjection?.title) {
      objections.push({
        id: `objection_${objections.length}`,
        title: currentObjection.title,
        response: responseLines.join('\n').trim(),
        lineIndex: currentObjection.lineIndex || 0,
      });
    }

    if (objections.length === 0 && rawContent.trim()) {
      const paragraphs = rawContent.split(/\n\n+/).filter(p => p.trim());
      paragraphs.forEach((para, idx) => {
        const firstLine = para.split('\n')[0].trim();
        const rest = para.split('\n').slice(1).join('\n').trim();
        objections.push({
          id: `objection_${idx}`,
          title: firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : ''),
          response: rest || firstLine,
          lineIndex: idx,
        });
      });
    }

    return objections;
  }, []);

  const objections = useMemo(() => parseObjections(scriptContent), [scriptContent, parseObjections]);

  // Get current text for an objection
  const getCurrentText = useCallback((objection: ParsedObjection) => {
    const alts = getAlternativesForObjection(objection.id);
    const currentIndex = currentAltIndexes[objection.id] || 0;
    
    const allOptions = [
      { text: objection.response, source: 'original' as const },
      ...alts.map(alt => ({ text: alt.alt_text, source: 'alt' as const, order: alt.alt_order }))
    ];
    
    const safeIndex = currentIndex % allOptions.length;
    return {
      text: allOptions[safeIndex].text,
      source: allOptions[safeIndex].source,
      totalCount: allOptions.length,
      currentIndex: safeIndex,
    };
  }, [getAlternativesForObjection, currentAltIndexes]);

  const handleCycle = useCallback((objectionId: string) => {
    const alts = getAlternativesForObjection(objectionId);
    const totalCount = 1 + alts.length;
    
    setCurrentAltIndexes(prev => ({
      ...prev,
      [objectionId]: ((prev[objectionId] || 0) + 1) % totalCount
    }));
  }, [getAlternativesForObjection]);

  const handleStartEdit = useCallback((objectionId: string, currentText: string) => {
    setEditingId(objectionId);
    setEditText(currentText);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

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

  const addAlternative = useCallback(
    async (objectionId: string, text: string) => {
      const existing = getAlternativesForObjection(objectionId);
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.alt_order)) + 1 : 1;
      await saveAlternative(objectionId, text, nextOrder);
    },
    [getAlternativesForObjection, saveAlternative]
  );

  const handleSaveEdit = useCallback(async (objection: ParsedObjection) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    const currentIndex = currentAltIndexes[objection.id] || 0;
    const alts = getAlternativesForObjection(objection.id);
    
    if (currentIndex === 0) {
      await addAlternative(objection.id, editText.trim());
      setCurrentAltIndexes(prev => ({
        ...prev,
        [objection.id]: alts.length + 1
      }));
    } else {
      const altIndex = currentIndex - 1;
      if (alts[altIndex]) {
        await saveAlternative(objection.id, editText.trim(), alts[altIndex].alt_order);
      }
    }
    
    setEditingId(null);
    setEditText("");
    toast.success("Alternative saved");
  }, [editText, currentAltIndexes, getAlternativesForObjection, addAlternative, saveAlternative]);

  const handleAddAlternative = useCallback(async (objectionId: string) => {
    if (!newAltText.trim()) {
      setAddingToId(null);
      return;
    }

    await addAlternative(objectionId, newAltText.trim());
    setAddingToId(null);
    setNewAltText("");
    toast.success("Alternative added");
  }, [newAltText, addAlternative]);

  const handleDeleteAlternative = useCallback(async (objection: ParsedObjection) => {
    const currentIndex = currentAltIndexes[objection.id] || 0;
    if (currentIndex === 0) {
      toast.error("Cannot delete original text");
      return;
    }

    const alts = getAlternativesForObjection(objection.id);
    const altIndex = currentIndex - 1;
    if (alts[altIndex]) {
      await deleteMutation.mutateAsync({ objectionId: objection.id, altOrder: alts[altIndex].alt_order });
      setCurrentAltIndexes(prev => ({
        ...prev,
        [objection.id]: Math.max(0, currentIndex - 1)
      }));
      toast.success("Alternative deleted");
    }
  }, [currentAltIndexes, getAlternativesForObjection, deleteMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (objections.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          No objections found. Save a script with objections first using the format:<br/>
          <code className="text-xs bg-muted px-1 py-0.5 rounded">**Objection Title**</code> followed by the response text.
        </p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="font-medium text-sm">Objection Alternatives</h3>
          <p className="text-xs text-muted-foreground">
            Add alternative responses for each objection. These can be cycled through by agents.
          </p>
        </div>
        
        <div className="space-y-4">
          {objections.map((objection) => {
            const { text, source, totalCount, currentIndex } = getCurrentText(objection);
            const hasAlternatives = totalCount > 1;
            const isEditing = editingId === objection.id;
            const isAdding = addingToId === objection.id;

            return (
              <div 
                key={objection.id} 
                className="border-l-2 border-amber-500/50 pl-3 py-2 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-sm text-foreground">{objection.title}</h4>
                  {hasAlternatives && (
                    <Badge variant="secondary" className="text-[10px]">
                      {currentIndex + 1}/{totalCount}
                    </Badge>
                  )}
                  {source === 'alt' && (
                    <Badge variant="outline" className="text-[10px] text-primary">
                      alt
                    </Badge>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(objection);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSaveEdit(objection)}
                      disabled={isSaving}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground pr-28 bg-muted/30 p-2 rounded">
                      {text}
                    </pre>
                    
                    <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded p-0.5">
                      {hasAlternatives && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleCycle(objection.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cycle alternatives ({currentIndex + 1}/{totalCount})</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleStartEdit(objection.id, text)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{source === 'original' ? 'Create alternative' : 'Edit alternative'}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setAddingToId(objection.id);
                              setNewAltText("");
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add alternative</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {source === 'alt' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteAlternative(objection)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete this alternative</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}

                {isAdding && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newAltText}
                      onChange={(e) => setNewAltText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddAlternative(objection.id);
                        if (e.key === 'Escape') setAddingToId(null);
                      }}
                      placeholder="Enter alternative response..."
                      className="flex-1 text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleAddAlternative(objection.id)}
                      disabled={isSaving || !newAltText.trim()}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setAddingToId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </TooltipProvider>
  );
};
