import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { useObjectionAlternatives, ObjectionAlternative } from "@/hooks/useObjectionAlternatives";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ObjectionDisplayProps {
  content: string;
}

interface ParsedObjection {
  id: string;
  title: string;
  response: string;
  lineIndex: number;
}

export const ObjectionDisplay = ({ content }: ObjectionDisplayProps) => {
  const { leadData } = useVICI();
  const { 
    alternatives, 
    getAlternativesForObjection, 
    saveAlternative, 
    addAlternative,
    deleteAlternative,
    isSaving,
    scriptName 
  } = useObjectionAlternatives();
  
  const [currentAltIndexes, setCurrentAltIndexes] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [newAltText, setNewAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse objections from content - expects format like:
  // **Objection Title**
  // Response text here
  const parseObjections = useCallback((rawContent: string): ParsedObjection[] => {
    const lines = rawContent.split('\n');
    const objections: ParsedObjection[] = [];
    let currentObjection: Partial<ParsedObjection> | null = null;
    let responseLines: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for objection title (bold format or numbered format)
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
      const numberedMatch = trimmed.match(/^(\d+[\.\)]\s*)(.+)$/);
      
      if (boldMatch || (numberedMatch && trimmed.length < 100)) {
        // Save previous objection
        if (currentObjection?.title) {
          objections.push({
            id: `objection_${objections.length}`,
            title: currentObjection.title,
            response: responseLines.join('\n').trim(),
            lineIndex: currentObjection.lineIndex || 0,
          });
        }
        
        // Start new objection
        currentObjection = {
          title: boldMatch ? boldMatch[1] : (numberedMatch ? numberedMatch[2] : trimmed),
          lineIndex: index,
        };
        responseLines = [];
      } else if (currentObjection && trimmed) {
        responseLines.push(trimmed);
      }
    });

    // Don't forget the last objection
    if (currentObjection?.title) {
      objections.push({
        id: `objection_${objections.length}`,
        title: currentObjection.title,
        response: responseLines.join('\n').trim(),
        lineIndex: currentObjection.lineIndex || 0,
      });
    }

    // If no structured objections found, treat each paragraph as an objection
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

  const objections = parseObjections(content);

  // Get current text for an objection (considering alternatives)
  const getCurrentText = useCallback((objection: ParsedObjection) => {
    const alts = getAlternativesForObjection(objection.id);
    const currentIndex = currentAltIndexes[objection.id] || 0;
    
    // All options: original + alternatives
    const allOptions = [
      { text: objection.response, source: 'original' as const },
      ...alts.map(alt => ({ text: alt.alt_text, source: 'alt' as const, order: alt.alt_order }))
    ];
    
    const safeIndex = currentIndex % allOptions.length;
    return {
      text: replaceScriptVariables(allOptions[safeIndex].text, leadData),
      source: allOptions[safeIndex].source,
      totalCount: allOptions.length,
      currentIndex: safeIndex,
    };
  }, [getAlternativesForObjection, currentAltIndexes, leadData]);

  // Cycle to next alternative
  const handleCycle = useCallback((objectionId: string) => {
    const alts = getAlternativesForObjection(objectionId);
    const totalCount = 1 + alts.length; // original + alternatives
    
    setCurrentAltIndexes(prev => ({
      ...prev,
      [objectionId]: ((prev[objectionId] || 0) + 1) % totalCount
    }));
  }, [getAlternativesForObjection]);

  // Start editing current alternative
  const handleStartEdit = useCallback((objectionId: string, currentText: string) => {
    setEditingId(objectionId);
    setEditText(currentText);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Save edited alternative
  const handleSaveEdit = useCallback(async (objection: ParsedObjection) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    const currentIndex = currentAltIndexes[objection.id] || 0;
    const alts = getAlternativesForObjection(objection.id);
    
    if (currentIndex === 0) {
      // Editing original - save as new alternative
      await addAlternative(objection.id, editText.trim());
      // Move to the new alternative
      setCurrentAltIndexes(prev => ({
        ...prev,
        [objection.id]: alts.length + 1
      }));
    } else {
      // Editing existing alternative
      const altIndex = currentIndex - 1;
      if (alts[altIndex]) {
        await saveAlternative(objection.id, editText.trim(), alts[altIndex].alt_order);
      }
    }
    
    setEditingId(null);
    setEditText("");
    toast.success("Alternative saved");
  }, [editText, currentAltIndexes, getAlternativesForObjection, addAlternative, saveAlternative]);

  // Add new alternative
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

  // Delete current alternative
  const handleDeleteAlternative = useCallback(async (objection: ParsedObjection) => {
    const currentIndex = currentAltIndexes[objection.id] || 0;
    if (currentIndex === 0) {
      toast.error("Cannot delete original text");
      return;
    }

    const alts = getAlternativesForObjection(objection.id);
    const altIndex = currentIndex - 1;
    if (alts[altIndex]) {
      await deleteAlternative(objection.id, alts[altIndex].alt_order);
      // Move back to previous
      setCurrentAltIndexes(prev => ({
        ...prev,
        [objection.id]: Math.max(0, currentIndex - 1)
      }));
      toast.success("Alternative deleted");
    }
  }, [currentAltIndexes, getAlternativesForObjection, deleteAlternative]);

  if (objections.length === 0) {
    return (
      <div className="prose prose-sm md:prose-base max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose text-foreground">
          {replaceScriptVariables(content, leadData)}
        </pre>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {objections.map((objection) => {
          const { text, source, totalCount, currentIndex } = getCurrentText(objection);
          const hasAlternatives = totalCount > 1;
          const isEditing = editingId === objection.id;
          const isAdding = addingToId === objection.id;

          return (
            <div 
              key={objection.id} 
              className="border-l-2 border-amber-500/50 pl-4 py-2 group"
            >
              {/* Objection Title */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-foreground">{objection.title}</h4>
                {hasAlternatives && (
                  <Badge variant="secondary" className="text-[10px]">
                    {currentIndex + 1}/{totalCount}
                  </Badge>
                )}
                {source === 'alt' && (
                  <Badge variant="outline" className="text-[10px] text-primary">
                    {scriptName.replace('_objection', '')}
                  </Badge>
                )}
              </div>

              {/* Response Text */}
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
                  <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base md:text-lg leading-relaxed text-foreground pr-24">
                    {text}
                  </pre>
                  
                  {/* Action buttons - visible on hover */}
                  <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Cycle button */}
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
                    
                    {/* Edit button */}
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
                    
                    {/* Add button */}
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
                    
                    {/* Delete button - only for alternatives */}
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

              {/* Add new alternative input */}
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
    </TooltipProvider>
  );
};
