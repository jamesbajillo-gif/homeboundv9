import { useState, useEffect, useCallback, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { RefreshCw, Pencil, Plus, Loader2 } from "lucide-react";
import { QualificationSection as SectionType, getEnabledQuestions, QualificationQuestion } from "@/config/qualificationConfig";
import { QuestionField } from "./QuestionField";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScriptQuestionAlts, ScriptQuestionAlt } from "@/hooks/useScriptQuestionAlts";
import { toast } from "sonner";

interface QualificationSectionProps {
  section: SectionType;
  form: UseFormReturn<any>;
}

// Storage key for current alternative selection index
const SELECTION_STORAGE_KEY = "qualification_question_selections";

// Get stored selection index per question
const getStoredSelections = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(SELECTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save selection index
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
  
  // Script-specific alternatives from database
  const { 
    alternatives: scriptAlts, 
    isLoading: altsLoading, 
    scriptName,
    getAlternativesForQuestion,
    saveAlternative,
    addAlternative,
    isSaving 
  } = useScriptQuestionAlts();
  
  // Track current selected alternative index for each question
  const [selectedAlternatives, setSelectedAlternatives] = useState<Record<string, number>>({});
  
  // Inline editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [originalText, setOriginalText] = useState(""); // Track original text to detect changes
  const [isAddingNew, setIsAddingNew] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load stored selections on mount and when scriptName changes
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

  // Build full list of question texts (primary + master + script-specific)
  const getAllTextsForQuestion = useCallback((
    question: QualificationQuestion, 
    scriptSpecificAlts: ScriptQuestionAlt[]
  ): { text: string; source: 'primary' | 'master' | 'script'; order?: number }[] => {
    const items: { text: string; source: 'primary' | 'master' | 'script'; order?: number }[] = [
      { text: question.question, source: 'primary', order: 0 }
    ];
    
    // Add master alternatives (from settings/forms)
    if (question.alternatives && question.alternatives.length > 0) {
      items.push(...question.alternatives.map((alt, idx) => ({
        text: alt.text,
        source: (alt.source || 'master') as 'master' | 'script',
        order: idx + 1
      })));
    }
    
    // Add script-specific alternatives
    scriptSpecificAlts.forEach(alt => {
      items.push({
        text: alt.alt_text,
        source: 'script',
        order: alt.alt_order
      });
    });
    
    return items;
  }, []);

  // Get displayed text for a question
  const getDisplayedText = useCallback((question: QualificationQuestion): string => {
    const alts = getAlternativesForQuestion(question.id);
    const allTexts = getAllTextsForQuestion(question, alts);
    const selectedIndex = selectedAlternatives[question.id] ?? 0;
    return allTexts[selectedIndex]?.text || question.question;
  }, [getAlternativesForQuestion, getAllTextsForQuestion, selectedAlternatives]);

  // Cycle to next alternative
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

  // Start inline edit
  const handleStartEdit = (questionId: string, currentText: string) => {
    setEditingQuestionId(questionId);
    setEditingText(currentText);
    setOriginalText(currentText);
    setIsAddingNew(false);
  };

  // Start adding new
  const handleStartAdd = (questionId: string) => {
    setEditingQuestionId(questionId);
    setEditingText("");
    setOriginalText("");
    setIsAddingNew(true);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditingText("");
    setOriginalText("");
    setIsAddingNew(false);
  };

  // Auto-save on blur
  const handleBlurSave = async (questionId: string) => {
    const trimmedText = editingText.trim();
    
    // If empty or unchanged, just cancel
    if (!trimmedText || (!isAddingNew && trimmedText === originalText)) {
      handleCancelEdit();
      return;
    }

    try {
      if (isAddingNew) {
        // Add new alternative
        await addAlternative(questionId, trimmedText);
        toast.success("Alternative saved");
      } else {
        // Editing existing - save as new script alternative
        await addAlternative(questionId, trimmedText);
        toast.success("Saved as script alternative");
      }
      
      // Auto-select the newly added (will be last in list after refetch)
      const question = enabledQuestions.find(q => q.id === questionId);
      if (question) {
        const currentAlts = getAlternativesForQuestion(questionId);
        const allTexts = getAllTextsForQuestion(question, currentAlts);
        const newIndex = allTexts.length; // New one will be at the end
        setSelectedAlternatives(prev => ({ ...prev, [questionId]: newIndex }));
        saveSelection(questionId, newIndex, scriptName);
      }
    } catch (error) {
      console.error("Error saving alternative:", error);
      toast.error("Failed to save");
    }
    
    handleCancelEdit();
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
      {/* Section Header */}
      <div className="border-b border-border pb-4">
        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
        )}
      </div>

      {/* Questions */}
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
                            <TooltipContent side="left" className="max-w-xs">
                              <div className="text-xs space-y-1.5">
                                <p className="font-medium">
                                  {currentIndex + 1} of {allTexts.length} • {getSourceLabel(currentSource)}
                                </p>
                                <div className="border-t pt-1.5 space-y-1">
                                  {allTexts.map((item, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`flex items-start gap-1.5 ${idx === currentIndex ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                                    >
                                      <span className="shrink-0">{idx + 1}.</span>
                                      <span className="flex-1 line-clamp-2">{item.text}</span>
                                      <span className={`shrink-0 text-[10px] px-1 rounded ${getSourceBgClass(item.source)}`}>
                                        {getSourceLabel(item.source)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-muted-foreground pt-1">Click to cycle</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

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
                          <TooltipContent>Edit (saves to script)</TooltipContent>
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
