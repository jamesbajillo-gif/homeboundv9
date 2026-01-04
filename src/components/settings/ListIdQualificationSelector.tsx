import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mysqlApi } from "@/lib/mysqlApi";
import { toast } from "sonner";
import { Loader2, Plus, Save, ListChecks, Trash2, Pencil, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ListIdQualificationSelectorProps {
  listId: string;
}

interface SelectedQuestionAlt {
  id: string;
  text: string;
  source?: "master" | "script";
}

interface SelectedQuestion {
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionText: string;
  alternatives?: SelectedQuestionAlt[];
  localAlternatives?: SelectedQuestionAlt[];
  zapierFieldName?: string;
  order: number;
}

export const ListIdQualificationSelector = ({
  listId,
}: ListIdQualificationSelectorProps) => {
  const queryClient = useQueryClient();
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SelectedQuestion | null>(null);
  const [newAltText, setNewAltText] = useState("");
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(new Set());
  const storageKey = `tmdebt_qualification_script_selected_listid_${listId}`;

  // Fetch both inbound and outbound master configs and merge them
  const { data: masterConfig, isLoading: configLoading } = useQuery({
    queryKey: ["qualification_master_config_combined"],
    queryFn: async (): Promise<QualificationConfig> => {
      try {
        // Fetch both inbound and outbound configs
        const [inboundData, outboundData] = await Promise.all([
          mysqlApi.findOneByField<{ setting_key: string; setting_value: string }>(
            "tmdebt_app_settings", "setting_key", "tmdebt_qualification_config_inbound"
          ),
          mysqlApi.findOneByField<{ setting_key: string; setting_value: string }>(
            "tmdebt_app_settings", "setting_key", "tmdebt_qualification_config_outbound"
          ),
        ]);

        const inboundConfig = inboundData?.setting_value 
          ? deserializeConfig(inboundData.setting_value) 
          : null;
        const outboundConfig = outboundData?.setting_value 
          ? deserializeConfig(outboundData.setting_value) 
          : null;

        // Merge configs - combine sections and deduplicate questions by ID
        if (inboundConfig && outboundConfig) {
          const sectionMap = new Map<string, typeof inboundConfig.sections[0]>();
          
          // Add inbound sections
          inboundConfig.sections.forEach(section => {
            sectionMap.set(section.id, { ...section });
          });
          
          // Merge outbound sections
          outboundConfig.sections.forEach(section => {
            if (sectionMap.has(section.id)) {
              const existing = sectionMap.get(section.id)!;
              // Merge questions, avoiding duplicates
              const questionIds = new Set(existing.questions.map(q => q.id));
              const newQuestions = section.questions.filter(q => !questionIds.has(q.id));
              sectionMap.set(section.id, {
                ...existing,
                questions: [...existing.questions, ...newQuestions],
              });
            } else {
              sectionMap.set(section.id, { ...section });
            }
          });
          
          return {
            version: inboundConfig.version,
            sections: Array.from(sectionMap.values()),
          };
        }
        
        return inboundConfig || outboundConfig || DEFAULT_QUALIFICATION_CONFIG;
      } catch (error) {
        console.error("Error loading master config:", error);
        return DEFAULT_QUALIFICATION_CONFIG;
      }
    },
  });

  // Load selected questions from database
  const { data: savedSelections, isLoading: selectionsLoading } = useQuery({
    queryKey: ["listid-qualification-selections", listId],
    queryFn: async (): Promise<SelectedQuestion[]> => {
      try {
        const data = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("tmdebt_app_settings", "setting_key", storageKey);

        if (data?.setting_value) {
          return JSON.parse(data.setting_value);
        }
        return [];
      } catch (error) {
        console.error("Error loading selections:", error);
        return [];
      }
    },
    enabled: !!listId,
  });

  // Update local state when data loads
  useEffect(() => {
    if (savedSelections && masterConfig) {
      const enriched = savedSelections.map((saved) => {
        for (const section of masterConfig.sections) {
          const question = section.questions.find((q) => q.id === saved.questionId);
          if (question) {
            return {
              ...saved,
              questionText: question.question,
              alternatives: question.alternatives?.map((alt) => ({ id: alt.id, text: alt.text })),
              zapierFieldName: question.zapierFieldName,
            };
          }
        }
        return saved;
      });
      setSelectedQuestions(enriched);
    } else if (savedSelections) {
      setSelectedQuestions(savedSelections);
    }
  }, [savedSelections, masterConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (questions: SelectedQuestion[]) => {
      await mysqlApi.upsertByFields(
        "tmdebt_app_settings",
        {
          setting_key: storageKey,
          setting_value: JSON.stringify(questions),
          setting_type: "json",
          description: `Selected qualification questions for list ID ${listId}`,
        },
        "setting_key"
      );
      return questions;
    },
    onSuccess: (questions) => {
      queryClient.setQueryData(["listid-qualification-selections", listId], questions);
      toast.success("Qualification questions saved");
    },
    onError: (error) => {
      console.error("Error saving selections:", error);
      toast.error("Failed to save selections");
    },
  });

  const handleAddFromQuestionnaire = () => {
    if (!masterConfig) return;
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

  const handleEditQuestion = (question: SelectedQuestion) => {
    setEditingQuestion({ ...question });
    setNewAltText("");
    setEditDialogOpen(true);
  };

  const handleAddLocalAlternative = () => {
    if (!newAltText.trim() || !editingQuestion) return;
    
    const newAlt: SelectedQuestionAlt = {
      id: `local_${Date.now()}`,
      text: newAltText.trim(),
      source: "script",
    };
    
    setEditingQuestion({
      ...editingQuestion,
      localAlternatives: [...(editingQuestion.localAlternatives || []), newAlt],
    });
    setNewAltText("");
  };

  const handleRemoveLocalAlternative = (altId: string) => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      localAlternatives: (editingQuestion.localAlternatives || []).filter(
        (alt) => alt.id !== altId
      ),
    });
  };

  const handleSaveQuestionEdits = () => {
    if (!editingQuestion) return;
    
    const updated = selectedQuestions.map((q) =>
      q.questionId === editingQuestion.questionId ? editingQuestion : q
    );
    setSelectedQuestions(updated);
    saveMutation.mutate(updated);
    setEditDialogOpen(false);
    setEditingQuestion(null);
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
              Qualification Questions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select questions for List ID: <Badge variant="outline">{listId}</Badge>
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
                  {questions.map((q, idx) => {
                    const allAlts = [
                      ...(q.alternatives || []).map((a) => ({ ...a, source: "master" as const })),
                      ...(q.localAlternatives || []),
                    ];
                    return (
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
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => handleEditQuestion(q)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => handleRemoveQuestion(q.questionId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {allAlts.length > 0 && (
                          <div className="pl-7 mt-1 space-y-0.5">
                            {allAlts.map((alt, i) => (
                              <p key={alt.id} className="text-xs text-muted-foreground">
                                <span className="text-primary/60">Alt {i + 1}:</span> {alt.text}
                                {alt.source === "script" && (
                                  <Badge variant="secondary" className="ml-1 text-[9px] h-3">
                                    local
                                  </Badge>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit question dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question Alternatives</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Question:</p>
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {editingQuestion.questionText}
                </p>
              </div>

              {/* Master alternatives (read-only) */}
              {editingQuestion.alternatives && editingQuestion.alternatives.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Master Alternatives:</p>
                  <div className="space-y-1">
                    {editingQuestion.alternatives.map((alt, idx) => (
                      <p key={alt.id} className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                        Alt {idx + 1}: {alt.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Local alternatives (editable) */}
              <div>
                <p className="text-sm font-medium mb-2">List-Specific Alternatives:</p>
                <div className="space-y-1 mb-2">
                  {(editingQuestion.localAlternatives || []).map((alt, idx) => (
                    <div
                      key={alt.id}
                      className="flex items-center gap-2 text-xs bg-primary/10 p-2 rounded"
                    >
                      <span className="flex-1">Alt {idx + 1}: {alt.text}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleRemoveLocalAlternative(alt.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newAltText}
                    onChange={(e) => setNewAltText(e.target.value)}
                    placeholder="Add new alternative..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLocalAlternative();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddLocalAlternative}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestionEdits}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
