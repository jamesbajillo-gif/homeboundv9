import { useState, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { RefreshCw } from "lucide-react";
import { QualificationSection as SectionType, getEnabledQuestions, QualificationQuestion } from "@/config/qualificationConfig";
import { QuestionField } from "./QuestionField";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export const QualificationSection = ({ section, form }: QualificationSectionProps) => {
  const enabledQuestions = getEnabledQuestions(section);
  
  // Track current selected alternative index for each question
  const [selectedAlternatives, setSelectedAlternatives] = useState<Record<string, number>>({});

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

  // Get the current question text to display
  const getDisplayedQuestionText = (question: QualificationQuestion): string => {
    if (!question.alternatives || question.alternatives.length === 0) {
      return question.question;
    }
    
    const allTexts = getAllQuestionTexts(question);
    const selectedIndex = selectedAlternatives[question.id] ?? 0;
    return allTexts[selectedIndex] || question.question;
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
          const hasAlternatives = question.alternatives && question.alternatives.length > 0;
          const allTextsWithSource = getAllQuestionTextsWithSource(question);
          const allTexts = allTextsWithSource.map(item => item.text);
          const currentIndex = selectedAlternatives[question.id] ?? 0;
          const currentSource = allTextsWithSource[currentIndex]?.source || 'primary';

          const getSourceLabel = (source: 'primary' | 'master' | 'script') => {
            if (source === 'primary') return 'Primary';
            if (source === 'master') return 'Forms';
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
                
                {/* Cycle button for alternatives */}
                {hasAlternatives && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => cycleAlternative(question.id, question)}
                        >
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="text-xs space-y-1.5">
                          <p className="font-medium">
                            Showing {currentIndex + 1} of {allTexts.length} • {getSourceLabel(currentSource)}
                          </p>
                          <div className="border-t pt-1.5 space-y-1">
                            {allTextsWithSource.map((item, idx) => (
                              <div 
                                key={idx} 
                                className={`flex items-start gap-1.5 ${idx === currentIndex ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                              >
                                <span className="shrink-0">{idx + 1}.</span>
                                <span className="flex-1 line-clamp-2">{item.text}</span>
                                <span className={`shrink-0 text-[10px] px-1 rounded ${
                                  item.source === 'primary' ? 'bg-primary/20' : 
                                  item.source === 'script' ? 'bg-green-500/20' : 'bg-muted'
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
    </div>
  );
};