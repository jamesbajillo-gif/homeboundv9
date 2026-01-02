import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Check, X, Pencil } from "lucide-react";
import { useSpielAlternatives } from "@/hooks/useSpielAlternatives";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpielDisplayProps {
  content: string;
  stepName: string;
  accentColor?: string;
}

interface UnifiedItem {
  spielId: string;
  text: string;
  isOriginal: boolean;
  altOrder?: number;
}

export const SpielDisplay = ({ content, stepName, accentColor = "border-primary" }: SpielDisplayProps) => {
  const { leadData } = useVICI();
  const { 
    alternatives, 
    getAlternativesForSpiel, 
    saveAlternative, 
    addAlternative,
    isSaving,
  } = useSpielAlternatives(stepName);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newAltText, setNewAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Build unified list: base spiel + alternatives
  const unifiedList = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    
    // Add original content as first item
    if (content && content.trim()) {
      items.push({
        spielId: 'spiel_0',
        text: content.trim(),
        isOriginal: true,
      });
    }
    
    // Add alternatives for the base spiel
    const alts = getAlternativesForSpiel('spiel_0');
    alts.forEach((alt) => {
      items.push({
        spielId: 'spiel_0',
        text: alt.alt_text,
        isOriginal: false,
        altOrder: alt.alt_order,
      });
    });
    
    return items;
  }, [content, getAlternativesForSpiel, alternatives]);

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
      await addAlternative(currentItem.spielId, editText.trim());
      toast.success("Alternative added");
    } else if (currentItem.altOrder !== undefined) {
      // Editing existing alternative
      await saveAlternative(currentItem.spielId, editText.trim(), currentItem.altOrder);
      toast.success("Alternative saved");
    }
    
    setIsEditing(false);
    setEditText("");
  }, [editText, currentItem, addAlternative, saveAlternative]);

  // Add new alternative
  const handleAddAlternative = useCallback(async () => {
    if (!newAltText.trim()) {
      setIsAdding(false);
      return;
    }

    await addAlternative('spiel_0', newAltText.trim());
    setIsAdding(false);
    setNewAltText("");
    toast.success("Alternative added");
  }, [newAltText, addAlternative]);

  if (unifiedList.length === 0) {
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
      <div className="space-y-3">
        {/* Action bar with counter and icons */}
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-0.5 font-normal border-border"
          >
            {safeIndex + 1} of {unifiedList.length}
          </Badge>
          
          {/* Action icons */}
          <div className="flex items-center gap-1">
            {unifiedList.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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

        {/* Content with colored left border */}
        <div className={`border-l-2 ${accentColor} pl-4`}>
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
                placeholder="Enter alternative text..."
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
            <pre className="whitespace-pre-wrap font-sans text-foreground text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose">
              {displayText}
            </pre>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
