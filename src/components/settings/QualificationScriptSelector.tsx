import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { Loader2, Plus, Save, ListChecks, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import {
  QualificationConfig,
  DEFAULT_QUALIFICATION_CONFIG,
  deserializeConfig,
  QualificationSection,
  QualificationQuestion,
} from "@/config/qualificationConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface QualificationScriptSelectorProps {
  stepName: string; // e.g., "outbound_qualification" or "qualification"
  stepTitle: string;
}

interface SelectedQuestionAlt {
  id: string;
  text: string;
}

interface SelectedQuestion {
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionText: string;
  alternatives?: SelectedQuestionAlt[];
  zapierFieldName?: string;
  order: number;
}

const STORAGE_KEY_PREFIX = "qualification_script_selected";

export const QualificationScriptSelector = ({
  stepName,
  stepTitle,
}: QualificationScriptSelectorProps) => {
  const queryClient = useQueryClient();
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(new Set());
  const storageKey = `${STORAGE_KEY_PREFIX}_${stepName}`;

  // Fetch the master questionnaire config from /settings/forms
  const { data: masterConfig, isLoading: configLoading } = useQuery({
    queryKey: ["qualification_master_config"],
    queryFn: async (): Promise<QualificationConfig> => {
      try {
        // Try outbound config first, then inbound
        const configKey = stepName.includes("outbound")
          ? "qualification_config_outbound"
          : "qualification_config_inbound";

        const configData = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("homebound_app_settings", "setting_key", configKey);

        if (configData?.setting_value) {
          const parsed = deserializeConfig(configData.setting_value);
          if (parsed) return parsed;
        }

        return DEFAULT_QUALIFICATION_CONFIG;
      } catch (error) {
        console.error("Error loading master config:", error);
        return DEFAULT_QUALIFICATION_CONFIG;
      }
    },
  });

  // Load selected questions from database
  const { data: savedSelections, isLoading: selectionsLoading } = useQuery({
    queryKey: QUERY_KEYS.scripts.byStep(storageKey),
    queryFn: async (): Promise<SelectedQuestion[]> => {
      try {
        const data = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("homebound_app_settings", "setting_key", storageKey);

        if (data?.setting_value) {
          return JSON.parse(data.setting_value);
        }
        return [];
      } catch (error) {
        console.error("Error loading selections:", error);
        return [];
      }
    },
  });

  // Update local state when data loads
  useEffect(() => {
    if (savedSelections) {
      setSelectedQuestions(savedSelections);
    }
  }, [savedSelections]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (questions: SelectedQuestion[]) => {
      await mysqlApi.upsertByFields(
        "homebound_app_settings",
        {
          setting_key: storageKey,
          setting_value: JSON.stringify(questions),
          setting_type: "json",
          description: `Selected qualification questions for ${stepName}`,
        },
        "setting_key"
      );
      return questions;
    },
    onSuccess: (questions) => {
      queryClient.setQueryData(QUERY_KEYS.scripts.byStep(storageKey), questions);
      toast.success("Qualification questions saved");
    },
    onError: (error) => {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections");
    },
  });

  const handleAddFromQuestionnaire = () => {
    if (!masterConfig) return;

    // Initialize pending selections with current selections
    const currentIds = new Set(selectedQuestions.map((q) => q.questionId));
    setPendingSelections(currentIds);
    setDialogOpen(true);
  };

  const handleToggleQuestion = (
    section: QualificationSection,
    question: QualificationQuestion
  ) => {
    const newSelections = new Set(pendingSelections);
    if (newSelections.has(question.id)) {
      newSelections.delete(question.id);
    } else {
      newSelections.add(question.id);
    }
    setPendingSelections(newSelections);
  };

  const handleConfirmSelections = () => {
    if (!masterConfig) return;

    // Build the selected questions array from pending selections
    const newSelected: SelectedQuestion[] = [];
    let order = 0;

    masterConfig.sections.forEach((section) => {
      section.questions
        .filter((q) => q.enabled)
        .sort((a, b) => a.order - b.order)
        .forEach((question) => {
          if (pendingSelections.has(question.id)) {
            newSelected.push({
              sectionId: section.id,
              sectionTitle: section.title,
              questionId: question.id,
              questionText: question.question,
              alternatives: question.alternatives?.map(alt => ({ id: alt.id, text: alt.text })),
              zapierFieldName: question.zapierFieldName,
              order: order++,
            });
          }
        });
    });

    setSelectedQuestions(newSelected);
    saveMutation.mutate(newSelected);
    setDialogOpen(false);
  };

  const handleRemoveQuestion = (questionId: string) => {
    const updated = selectedQuestions
      .filter((q) => q.questionId !== questionId)
      .map((q, idx) => ({ ...q, order: idx }));
    setSelectedQuestions(updated);
    saveMutation.mutate(updated);
  };

  const handleClearAll = () => {
    setSelectedQuestions([]);
    saveMutation.mutate([]);
  };

  const isLoading = configLoading || selectionsLoading;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  // Group selected questions by section
  const groupedQuestions = selectedQuestions.reduce((acc, q) => {
    if (!acc[q.sectionId]) {
      acc[q.sectionId] = { title: q.sectionTitle, questions: [] };
    }
    acc[q.sectionId].questions.push(q);
    return acc;
  }, {} as Record<string, { title: string; questions: SelectedQuestion[] }>);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              {stepTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add questions from the qualification questionnaire configured in Forms settings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedQuestions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddFromQuestionnaire}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add from Questionnaire
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Select Questions from Questionnaire</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <Accordion type="multiple" defaultValue={masterConfig?.sections.map(s => s.id) || []}>
                    {masterConfig?.sections
                      .filter((s) => s.enabled)
                      .map((section) => {
                        const enabledQuestions = section.questions
                          .filter((q) => q.enabled)
                          .sort((a, b) => a.order - b.order);
                        const selectedCount = enabledQuestions.filter((q) =>
                          pendingSelections.has(q.id)
                        ).length;

                        return (
                          <AccordionItem key={section.id} value={section.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <span>{section.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {selectedCount}/{enabledQuestions.length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2">
                                {enabledQuestions.map((question) => {
                                  const hasAlternatives = question.alternatives && question.alternatives.length > 0;
                                  return (
                                    <label
                                      key={question.id}
                                      className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={pendingSelections.has(question.id)}
                                        onCheckedChange={() =>
                                          handleToggleQuestion(section, question)
                                        }
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <span className="text-sm">{question.question}</span>
                                        {hasAlternatives && (
                                          <div className="pl-3 border-l-2 border-muted space-y-0.5">
                                            {question.alternatives!.map((alt, idx) => (
                                              <p key={alt.id} className="text-xs text-muted-foreground">
                                                Alt {idx + 1}: {alt.text}
                                              </p>
                                            ))}
                                          </div>
                                        )}
                                        {question.zapierFieldName && (
                                          <Badge variant="outline" className="text-[10px] h-4 font-mono">
                                            {question.zapierFieldName}
                                          </Badge>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                                {enabledQuestions.length === 0 && (
                                  <p className="text-sm text-muted-foreground italic py-2">
                                    No enabled questions in this section
                                  </p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                  </Accordion>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmSelections}>
                    <Save className="h-4 w-4 mr-1" />
                    Save Selection ({pendingSelections.size})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Display selected questions */}
        {selectedQuestions.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No questions selected yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Add from Questionnaire" to select questions from the form configuration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedQuestions).map(([sectionId, { title, questions }]) => (
              <div key={sectionId} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="space-y-1">
                  {questions.map((q, idx) => (
                    <div
                      key={q.questionId}
                      className="p-2 bg-muted/30 rounded text-sm group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">
                          {idx + 1}.
                        </span>
                        <span className="flex-1">{q.questionText}</span>
                        {q.zapierFieldName && (
                          <Badge variant="outline" className="text-[10px] h-4 font-mono">
                            {q.zapierFieldName}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => handleRemoveQuestion(q.questionId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {q.alternatives && q.alternatives.length > 0 && (
                        <div className="ml-7 mt-1 pl-2 border-l-2 border-muted space-y-0.5">
                          {q.alternatives.map((alt, altIdx) => (
                            <p key={alt.id} className="text-xs text-muted-foreground">
                              Alt {altIdx + 1}: {alt.text}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
