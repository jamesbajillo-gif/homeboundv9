import { useState, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { RefreshCw, Pencil, Plus, X } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface QualificationSectionProps {
  section: SectionType;
  form: UseFormReturn<any>;
}

// Storage key for question alternatives
const ALTERNATIVES_STORAGE_KEY = "qualification_question_alternatives";

// Get all question texts for a question (primary + alternatives) with source info
const getAllQuestionTextsWithSource = (question: QualificationQuestion): { text: string; source: 'primary' | 'master' | 'script' }[] => {
  const items: { text: string; source: 'primary' | 'master' | 'script' }[] = [
    { text: question.question, source: 'primary' }
  ];
  if (question.alternatives && question.alternatives.length > 0) {
    items.push(...question.alternatives.map(alt => ({
      text: alt.text,
      source: (alt.source || 'master') as 'master' | 'script'
    })));
  }
  return items;
};

// Get all question texts for a question (primary + alternatives)
const getAllQuestionTexts = (question: QualificationQuestion): string[] => {
  return getAllQuestionTextsWithSource(question).map(item => item.text);
};

// Get stored alternative selections from localStorage
const getStoredSelections = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(ALTERNATIVES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save alternative selections to localStorage
const saveSelection = (questionId: string, index: number) => {
  try {
    const selections = getStoredSelections();
    selections[questionId] = index;
    localStorage.setItem(ALTERNATIVES_STORAGE_KEY, JSON.stringify(selections));
  } catch (error) {
    console.error("Error saving alternative selection:", error);
  }
};

// Local alternatives storage key (session-specific, not saved to DB)
const LOCAL_ALTS_STORAGE_KEY = "qualification_local_alternatives";

const getStoredLocalAlternatives = (): Record<string, { id: string; text: string }[]> => {
  try {
    const stored = localStorage.getItem(LOCAL_ALTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveLocalAlternatives = (questionId: string, alts: { id: string; text: string }[]) => {
  try {
    const all = getStoredLocalAlternatives();
    all[questionId] = alts;
    localStorage.setItem(LOCAL_ALTS_STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("Error saving local alternatives:", error);
  }
};

export const QualificationSection = ({ section, form }: QualificationSectionProps) => {
  const enabledQuestions = getEnabledQuestions(section);
  
  // Track current selected alternative index for each question
  const [selectedAlternatives, setSelectedAlternatives] = useState<Record<string, number>>({});
  
  // Track locally added alternatives (session-specific)
  const [localAlternatives, setLocalAlternatives] = useState<Record<string, { id: string; text: string }[]>>({});
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [newAltText, setNewAltText] = useState("");

  // Load local alternatives on mount
  useEffect(() => {
    setLocalAlternatives(getStoredLocalAlternatives());
  }, []);

  // Load stored selections on mount
  useEffect(() => {
    const stored = getStoredSelections();
    const initial: Record<string, number> = {};
    
    enabledQuestions.forEach(question => {
      if (question.alternatives && question.alternatives.length > 0) {
        // Use stored value if exists, otherwise use default or random based on selectionMode
        if (stored[question.id] !== undefined) {
          initial[question.id] = stored[question.id];
        } else if (question.selectionMode === 'random') {
          // Random selection from all texts (primary + alternatives)
          const allTexts = getAllQuestionTexts(question);
          initial[question.id] = Math.floor(Math.random() * allTexts.length);
        } else {
          // Use default alternative if set, otherwise use primary (index 0)
          const defaultAltIndex = question.alternatives.findIndex(alt => alt.isDefault);
          initial[question.id] = defaultAltIndex >= 0 ? defaultAltIndex + 1 : 0; // +1 because primary is at index 0
        }
      }
    });
    
    setSelectedAlternatives(initial);
  }, [enabledQuestions]);

  // Cycle to next alternative
  const cycleAlternative = useCallback((questionId: string, question: QualificationQuestion) => {
    const allTexts = getAllQuestionTexts(question);
    if (allTexts.length <= 1) return; // No alternatives to cycle

    setSelectedAlternatives(prev => {
      const currentIndex = prev[questionId] ?? 0;
      const nextIndex = (currentIndex + 1) % allTexts.length;
      
      // Save to localStorage
      saveSelection(questionId, nextIndex);
      
      return { ...prev, [questionId]: nextIndex };
    });
  }, []);

  // Get all texts including local alternatives
  const getFullQuestionTextsWithSource = useCallback((question: QualificationQuestion): { text: string; source: 'primary' | 'master' | 'script' | 'local' }[] => {
    const items: { text: string; source: 'primary' | 'master' | 'script' | 'local' }[] = [
      { text: question.question, source: 'primary' }
    ];
    if (question.alternatives && question.alternatives.length > 0) {
      items.push(...question.alternatives.map(alt => ({
        text: alt.text,
        source: (alt.source || 'master') as 'master' | 'script'
      })));
    }
    // Add local alternatives
    const localAlts = localAlternatives[question.id] || [];
    items.push(...localAlts.map(alt => ({
      text: alt.text,
      source: 'local' as const
    })));
    return items;
  }, [localAlternatives]);

  // Get the current question text to display
  const getDisplayedQuestionText = useCallback((question: QualificationQuestion): string => {
    const allTexts = getFullQuestionTextsWithSource(question);
    if (allTexts.length <= 1) {
      return question.question;
    }
    const selectedIndex = selectedAlternatives[question.id] ?? 0;
    return allTexts[selectedIndex]?.text || question.question;
  }, [getFullQuestionTextsWithSource, selectedAlternatives]);

  // Handle opening edit dialog
  const handleOpenEdit = (questionId: string) => {
    setEditingQuestionId(questionId);
    setNewAltText("");
    setEditDialogOpen(true);
  };

  // Handle adding local alternative
  const handleAddLocalAlt = () => {
    if (!newAltText.trim() || !editingQuestionId) return;
    
    const currentAlts = localAlternatives[editingQuestionId] || [];
    const newAlt = {
      id: `local_${Date.now()}`,
      text: newAltText.trim()
    };
    const updated = [...currentAlts, newAlt];
    
    setLocalAlternatives(prev => ({
      ...prev,
      [editingQuestionId]: updated
    }));
    saveLocalAlternatives(editingQuestionId, updated);
    setNewAltText("");
    toast.success("Alternative added");
  };

  // Handle removing local alternative
  const handleRemoveLocalAlt = (questionId: string, altId: string) => {
    const currentAlts = localAlternatives[questionId] || [];
    const updated = currentAlts.filter(a => a.id !== altId);
    
    setLocalAlternatives(prev => ({
      ...prev,
      [questionId]: updated
    }));
    saveLocalAlternatives(questionId, updated);
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

      {/* Questions with Inline Fields */}
      <div className="space-y-6 pt-2">
        {enabledQuestions.map((question, questionIndex) => {
          const fullTextsWithSource = getFullQuestionTextsWithSource(question);
          const hasAnyAlternatives = fullTextsWithSource.length > 1;
          const currentIndex = selectedAlternatives[question.id] ?? 0;
          const currentSource = fullTextsWithSource[currentIndex]?.source || 'primary';
          const questionLocalAlts = localAlternatives[question.id] || [];

          const getSourceLabel = (source: 'primary' | 'master' | 'script' | 'local') => {
            if (source === 'primary') return 'Primary';
            if (source === 'master') return 'Forms';
            if (source === 'local') return 'Session';
            return 'Script';
          };

          return (
            <div key={question.id} className="space-y-3">
              {/* Question */}
              <div className="flex items-start gap-3">
                <span className="text-base font-medium text-foreground min-w-[2rem] pt-0.5">
                  {questionIndex + 1}.
                </span>
                <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                  {getDisplayedQuestionText(question)}
                  {question.isRequired && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
                
                {/* Action buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Cycle button */}
                  {hasAnyAlternatives && (
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
                              Showing {currentIndex + 1} of {fullTextsWithSource.length} • {getSourceLabel(currentSource)}
                            </p>
                            <div className="border-t pt-1.5 space-y-1">
                              {fullTextsWithSource.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className={`flex items-start gap-1.5 ${idx === currentIndex ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                                >
                                  <span className="shrink-0">{idx + 1}.</span>
                                  <span className="flex-1 line-clamp-2">{item.text}</span>
                                  <span className={`shrink-0 text-[10px] px-1 rounded ${
                                    item.source === 'primary' ? 'bg-primary/20' : 
                                    item.source === 'script' ? 'bg-green-500/20' :
                                    item.source === 'local' ? 'bg-blue-500/20' : 'bg-muted'
                                  }`}>
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

                  {/* Edit button */}
                  {hasAnyAlternatives && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenEdit(question.id)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit alternatives</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Add button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenEdit(question.id)}
                        >
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add alternative</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Input Field based on question's inline config */}
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

      {/* Edit Alternatives Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Alternatives</DialogTitle>
          </DialogHeader>
          {editingQuestionId && (
            <div className="space-y-4">
              {/* Show the question */}
              <div className="p-3 bg-muted/50 rounded text-sm">
                {enabledQuestions.find(q => q.id === editingQuestionId)?.question}
              </div>

              {/* Existing alternatives from config (read-only) */}
              {(() => {
                const question = enabledQuestions.find(q => q.id === editingQuestionId);
                if (question?.alternatives && question.alternatives.length > 0) {
                  return (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">From Config:</p>
                      {question.alternatives.map((alt, idx) => (
                        <div key={alt.id} className="flex items-center gap-2 text-xs text-muted-foreground pl-2 border-l-2">
                          <span>{idx + 1}. {alt.text}</span>
                          <span className={`text-[10px] px-1 rounded ${
                            alt.source === 'script' ? 'bg-green-500/20' : 'bg-muted'
                          }`}>
                            {alt.source === 'script' ? 'Script' : 'Forms'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Session-local alternatives (editable) */}
              <div className="space-y-2">
                <p className="text-xs font-medium">Session Alternatives:</p>
                {(localAlternatives[editingQuestionId] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No session alternatives added</p>
                ) : (
                  <div className="space-y-1">
                    {(localAlternatives[editingQuestionId] || []).map((alt, idx) => (
                      <div key={alt.id} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="flex-1 text-sm">{alt.text}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleRemoveLocalAlt(editingQuestionId, alt.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new */}
                <div className="flex gap-2 pt-2">
                  <Input
                    value={newAltText}
                    onChange={(e) => setNewAltText(e.target.value)}
                    placeholder="Add alternative phrasing..."
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLocalAlt())}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddLocalAlt}
                    disabled={!newAltText.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Session alternatives are stored locally and will persist until browser data is cleared.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};