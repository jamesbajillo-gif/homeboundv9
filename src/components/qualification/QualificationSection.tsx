import { useState, useEffect, useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { RefreshCw, Pencil, Plus, Loader2, List, Trash2, Star } from "lucide-react";
import { QualificationSection as SectionType, getEnabledQuestions, QualificationQuestion } from "@/config/qualificationConfig";
import { QuestionField } from "./QuestionField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useScriptQuestionAlts, ScriptQuestionAlt } from "@/hooks/useScriptQuestionAlts";
import { toast } from "sonner";

interface QualificationSectionProps {
  section: SectionType;
  form: UseFormReturn<any>;
}

// Storage key for current alternative selection index
const SELECTION_STORAGE_KEY = "qualification_question_selections";

const saveSelection = (questionId: string, index: number, scriptName: string) => {
  try {
    const key = `${SELECTION_STORAGE_KEY}_${scriptName}`;
    const stored = localStorage.getItem(key);
    const selections = stored ? JSON.parse(stored) : {};
    selections[questionId] = index;
    localStorage.setItem(key, JSON.stringify(selections));
  } catch (error) {
    console.error("Error saving selection:", error);
  }
};

const getStoredScriptSelections = (scriptName: string): Record<string, number> => {
  try {
    const key = `${SELECTION_STORAGE_KEY}_${scriptName}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const QualificationSection = ({ section, form }: QualificationSectionProps) => {
  const enabledQuestions = getEnabledQuestions(section);
  
  const { 
    alternatives: scriptAlts, 
    isLoading: altsLoading, 
    scriptName,
    getAlternativesForQuestion,
    addAlternative,
    deleteAlternativeById,
    setDefaultAlternative,
    clearDefault,
    isSaving,
    isDeleting 
  } = useScriptQuestionAlts();
  
  const [selectedAlternatives, setSelectedAlternatives] = useState<Record<string, number>>({});
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [listOpenFor, setListOpenFor] = useState<string | null>(null);
  const [newAltText, setNewAltText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = getStoredScriptSelections(scriptName);
    const initial: Record<string, number> = {};
    
    enabledQuestions.forEach(question => {
      if (stored[question.id] !== undefined) {
        initial[question.id] = stored[question.id];
      } else if (question.selectionMode === 'random') {
        const allTexts = getAllTextsForQuestion(question, getAlternativesForQuestion(question.id));
        initial[question.id] = Math.floor(Math.random() * allTexts.length);
      } else {
        initial[question.id] = 0;
      }
    });
    
    setSelectedAlternatives(initial);
  }, [scriptName, scriptAlts]);

  const getAllTextsForQuestion = useCallback((
    question: QualificationQuestion, 
    scriptSpecificAlts: ScriptQuestionAlt[]
  ): { text: string; source: 'primary' | 'master' | 'script'; order?: number; id?: number; isDefault?: boolean }[] => {
    const items: { text: string; source: 'primary' | 'master' | 'script'; order?: number; id?: number; isDefault?: boolean }[] = [
      { text: question.question, source: 'primary', order: 0 }
    ];
    
    if (question.alternatives && question.alternatives.length > 0) {
      items.push(...question.alternatives.map((alt, idx) => ({
        text: alt.text,
        source: (alt.source || 'master') as 'master' | 'script',
        order: idx + 1,
        isDefault: alt.isDefault
      })));
    }
    
    scriptSpecificAlts.forEach(alt => {
      items.push({
        text: alt.alt_text,
        source: 'script',
        order: alt.alt_order,
        id: alt.id,
        isDefault: alt.is_default === 1
      });
    });
    
    return items;
  }, []);

  const getDisplayedText = useCallback((question: QualificationQuestion): string => {
    const alts = getAlternativesForQuestion(question.id);
    const allTexts = getAllTextsForQuestion(question, alts);
    const selectedIndex = selectedAlternatives[question.id] ?? 0;
    return allTexts[selectedIndex]?.text || question.question;
  }, [getAlternativesForQuestion, getAllTextsForQuestion, selectedAlternatives]);

  const cycleAlternative = useCallback((questionId: string, question: QualificationQuestion) => {
    const alts = getAlternativesForQuestion(questionId);
    const allTexts = getAllTextsForQuestion(question, alts);
    if (allTexts.length <= 1) return;

    setSelectedAlternatives(prev => {
      const currentIndex = prev[questionId] ?? 0;
      const nextIndex = (currentIndex + 1) % allTexts.length;
      saveSelection(questionId, nextIndex, scriptName);
      return { ...prev, [questionId]: nextIndex };
    });
  }, [getAlternativesForQuestion, getAllTextsForQuestion, scriptName]);

  const handleStartEdit = (questionId: string, currentText: string) => {
    setEditingQuestionId(questionId);
    setEditingText(currentText);
    setOriginalText(currentText);
    setIsAddingNew(false);
  };

  const handleStartAdd = (questionId: string) => {
    setEditingQuestionId(questionId);
    setEditingText("");
    setOriginalText("");
    setIsAddingNew(true);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditingText("");
    setOriginalText("");
    setIsAddingNew(false);
  };

  const handleBlurSave = async (questionId: string) => {
    const trimmedText = editingText.trim();
    
    if (!trimmedText || (!isAddingNew && trimmedText === originalText)) {
      handleCancelEdit();
      return;
    }

    try {
      await addAlternative(questionId, trimmedText);
      toast.success(isAddingNew ? "Alternative added" : "Saved as script alternative");
      
      const question = enabledQuestions.find(q => q.id === questionId);
      if (question) {
        const currentAlts = getAlternativesForQuestion(questionId);
        const allTexts = getAllTextsForQuestion(question, currentAlts);
        const newIndex = allTexts.length;
        setSelectedAlternatives(prev => ({ ...prev, [questionId]: newIndex }));
        saveSelection(questionId, newIndex, scriptName);
      }
    } catch (error) {
      console.error("Error saving alternative:", error);
      toast.error("Failed to save");
    }
    
    handleCancelEdit();
  };

  const handleAddFromList = async (questionId: string) => {
    if (!newAltText.trim()) return;
    
    try {
      await addAlternative(questionId, newAltText.trim());
      toast.success("Alternative added");
      setNewAltText("");
    } catch (error) {
      toast.error("Failed to add");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAlternativeById(id);
      toast.success("Alternative removed");
    } catch (error) {
      toast.error("Failed to remove");
    }
  };

  const handleSetDefault = async (questionId: string, altOrder: number, currentlyDefault: boolean) => {
    try {
      if (currentlyDefault) {
        await clearDefault(questionId);
        toast.success("Default cleared");
      } else {
        await setDefaultAlternative(questionId, altOrder);
        toast.success("Set as default");
      }
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleSelectFromList = (questionId: string, index: number) => {
    setSelectedAlternatives(prev => ({ ...prev, [questionId]: index }));
    saveSelection(questionId, index, scriptName);
    setListOpenFor(null);
  };

  const getSourceLabel = (source: 'primary' | 'master' | 'script') => {
    if (source === 'primary') return 'Default';
    if (source === 'master') return 'Forms';
    return 'Script';
  };

  const getSourceBgClass = (source: 'primary' | 'master' | 'script') => {
    if (source === 'primary') return 'bg-primary/20';
    if (source === 'master') return 'bg-muted';
    return 'bg-green-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
        )}
      </div>

      <div className="space-y-6 pt-2">
        {enabledQuestions.map((question, questionIndex) => {
          const questionAlts = getAlternativesForQuestion(question.id);
          const allTexts = getAllTextsForQuestion(question, questionAlts);
          const hasAlternatives = allTexts.length > 1;
          const currentIndex = selectedAlternatives[question.id] ?? 0;
          const currentSource = allTexts[currentIndex]?.source || 'primary';
          const isEditing = editingQuestionId === question.id;
          const displayedText = getDisplayedText(question);

          return (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-base font-medium text-foreground min-w-[2rem] pt-0.5">
                  {questionIndex + 1}.
                </span>
                
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      placeholder={isAddingNew ? "Type new alternative..." : ""}
                      className="flex-1 text-base font-medium text-foreground bg-transparent border-b-2 border-primary focus:outline-none py-0.5"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleBlurSave(question.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      onBlur={() => handleBlurSave(question.id)}
                    />
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {question.isRequired && <span className="text-destructive">*</span>}
                  </div>
                ) : (
                  <>
                    <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                      {displayedText}
                      {question.isRequired && <span className="text-destructive ml-1">*</span>}
                    </p>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                      {hasAlternatives && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => cycleAlternative(question.id, question)}
                              >
                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cycle alternatives</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* List button with popover */}
                      <Popover open={listOpenFor === question.id} onOpenChange={(open) => setListOpenFor(open ? question.id : null)}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <List className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Manage alternatives</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <PopoverContent className="w-96 p-0" align="end">
                          <div className="p-3 border-b">
                            <h4 className="font-medium text-sm">Question Alternatives</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Click to select, star to set default</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {allTexts.map((item, idx) => (
                              <div 
                                key={idx}
                                className={`flex items-start gap-2 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${idx === currentIndex ? 'bg-primary/10' : ''}`}
                                onClick={() => handleSelectFromList(question.id, idx)}
                              >
                                <span className="text-xs text-muted-foreground min-w-[1.5rem] pt-0.5">{idx + 1}.</span>
                                <span className="flex-1 text-sm">{item.text}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${getSourceBgClass(item.source)}`}>
                                    {getSourceLabel(item.source)}
                                  </span>
                                  {item.source === 'script' && item.id && (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetDefault(question.id, item.order!, item.isDefault || false);
                                        }}
                                      >
                                        <Star className={`h-3.5 w-3.5 ${item.isDefault ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(item.id!);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="p-2 border-t flex gap-2">
                            <Input
                              value={newAltText}
                              onChange={(e) => setNewAltText(e.target.value)}
                              placeholder="Add new alternative..."
                              className="text-sm h-8"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddFromList(question.id);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8"
                              onClick={() => handleAddFromList(question.id)}
                              disabled={!newAltText.trim() || isSaving}
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartEdit(question.id, displayedText)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit inline</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartAdd(question.id)}
                            >
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add alternative</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </div>

              <div className="ml-11">
                <QuestionField question={question} form={form} />
              </div>
            </div>
          );
        })}

        {enabledQuestions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No questions configured for this section.
          </p>
        )}
      </div>
    </div>
  );
};
