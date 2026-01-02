import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Check, X, Pencil, MessageSquare } from "lucide-react";
import { useObjectionAlternatives } from "@/hooks/useObjectionAlternatives";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ObjectionDisplayProps {
  content: string;
}

interface ParsedObjection {
  id: string;
  title: string;
  response: string;
  lineIndex: number;
}

interface UnifiedItem {
  objectionId: string;
  text: string;
  isOriginal: boolean;
  altOrder?: number;
}

export const ObjectionDisplay = ({ content }: ObjectionDisplayProps) => {
  const { leadData } = useVICI();
  const { 
    alternatives, 
    getAlternativesForObjection, 
    saveAlternative, 
    addAlternative,
    isSaving,
  } = useObjectionAlternatives();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newAltText, setNewAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse objections from content
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

  const objections = parseObjections(content);

  // Build unified list: all objections + their alternatives in one flat array
  const unifiedList = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    
    objections.forEach((objection) => {
      // Add original
      items.push({
        objectionId: objection.id,
        text: objection.response,
        isOriginal: true,
      });
      
      // Add alternatives for this objection
      const alts = getAlternativesForObjection(objection.id);
      alts.forEach((alt) => {
        items.push({
          objectionId: objection.id,
          text: alt.alt_text,
          isOriginal: false,
          altOrder: alt.alt_order,
        });
      });
    });
    
    return items;
  }, [objections, getAlternativesForObjection, alternatives]);

  // Safe current index
  const safeIndex = unifiedList.length > 0 ? currentIndex % unifiedList.length : 0;
  const currentItem = unifiedList[safeIndex];

  // Cycle to next item
  const handleCycle = useCallback(() => {
    if (unifiedList.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % unifiedList.length);
    }
  }, [unifiedList.length]);

  // Start editing current item
  const handleStartEdit = useCallback(() => {
    if (currentItem) {
      setIsEditing(true);
      setEditText(currentItem.text);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [currentItem]);

  // Save edited item
  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim() || !currentItem) {
      setIsEditing(false);
      return;
    }

    if (currentItem.isOriginal) {
      // Editing original - save as new alternative
      await addAlternative(currentItem.objectionId, editText.trim());
      toast.success("Alternative added");
    } else if (currentItem.altOrder !== undefined) {
      // Editing existing alternative
      await saveAlternative(currentItem.objectionId, editText.trim(), currentItem.altOrder);
      toast.success("Alternative saved");
    }
    
    setIsEditing(false);
    setEditText("");
  }, [editText, currentItem, addAlternative, saveAlternative]);

  // Add new alternative
  const handleAddAlternative = useCallback(async () => {
    if (!newAltText.trim() || !currentItem) {
      setIsAdding(false);
      return;
    }

    await addAlternative(currentItem.objectionId, newAltText.trim());
    setIsAdding(false);
    setNewAltText("");
    toast.success("Alternative added");
  }, [newAltText, currentItem, addAlternative]);

  if (objections.length === 0) {
    return (
      <div className="prose prose-sm md:prose-base max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose text-foreground">
          {replaceScriptVariables(content, leadData)}
        </pre>
      </div>
    );
  }

  const displayText = currentItem ? replaceScriptVariables(currentItem.text, leadData) : "";

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Header row with icon, badge, title, and actions */}
        <div className="flex items-start gap-3">
          {/* Icon with badge */}
          <div className="relative flex-shrink-0">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            <Badge 
              variant="outline" 
              className="absolute -top-3 -right-6 text-[10px] px-1.5 py-0 h-4 font-normal border-border bg-background"
            >
              {safeIndex + 1} of {unifiedList.length}
            </Badge>
          </div>
          
          {/* Title and actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="font-semibold text-foreground">Objection Handling</span>
            
            {/* Action icons - inline with title */}
            {unifiedList.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleCycle}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next ({safeIndex + 1}/{unifiedList.length})</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentItem?.isOriginal ? 'Create alternative' : 'Edit'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setIsAdding(true);
                    setNewAltText("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add alternative</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content with amber left border */}
        <div className="border-l-2 border-amber-500 pl-4 ml-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="flex-1"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : isAdding ? (
            <div className="flex gap-2">
              <Input
                value={newAltText}
                onChange={(e) => setNewAltText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAlternative();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                placeholder="Enter alternative response..."
                className="flex-1"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleAddAlternative}
                disabled={isSaving || !newAltText.trim()}
              >
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsAdding(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-foreground text-sm sm:text-base leading-relaxed">
              {displayText}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
