import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useQualificationConfig } from "@/hooks/useQualificationConfig";
import { useQualificationFields } from "@/hooks/useQualificationFields";
import { toast } from "sonner";
import {
  Loader2,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  RotateCcw,
  Save,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { QualificationQuestion, QualificationSection } from "@/config/qualificationConfig";

export const QuestionnaireSettings = () => {
  const {
    config,
    isLoading,
    isSaving,
    updateSection,
    updateQuestion,
    addQuestion,
    removeQuestion,
    resetToDefaults,
    saveConfig,
  } = useQualificationConfig();
  const { fields } = useQualificationFields();

  const [editingQuestion, setEditingQuestion] = useState<{
    sectionId: string;
    questionId: string;
  } | null>(null);
  const [newQuestion, setNewQuestion] = useState<{
    sectionId: string;
    text: string;
    fieldName: string | null;
  } | null>(null);

  // Get available fields that can be mapped to questions
  const availableFields = fields.map(f => ({
    value: f.field_name,
    label: f.field_label,
    section: f.field_section,
  }));

  const handleAddQuestion = (sectionId: string) => {
    setNewQuestion({ sectionId, text: "", fieldName: null });
  };

  const handleSaveNewQuestion = () => {
    if (!newQuestion || !newQuestion.text.trim()) {
      toast.error("Question text is required");
      return;
    }

    addQuestion(newQuestion.sectionId, {
      id: `${newQuestion.sectionId}_q${Date.now()}`,
      question: newQuestion.text.trim(),
      fieldName: newQuestion.fieldName,
      enabled: true,
    });

    setNewQuestion(null);
  };

  const handleMoveQuestion = (sectionId: string, questionId: string, direction: 'up' | 'down') => {
    const section = config.sections.find(s => s.id === sectionId);
    if (!section) return;

    const questions = [...section.questions].sort((a, b) => a.order - b.order);
    const currentIndex = questions.findIndex(q => q.id === questionId);

    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === questions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newOrder = questions.map((q, i) => {
      if (i === currentIndex) return { ...q, order: questions[newIndex].order };
      if (i === newIndex) return { ...q, order: questions[currentIndex].order };
      return q;
    });

    const updatedSection = { ...section, questions: newOrder };
    saveConfig({ ...config, sections: config.sections.map(s => s.id === sectionId ? updatedSection : s) });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Questionnaire Configuration</h2>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Default Questions?</AlertDialogTitle>
              <AlertDialogDescription>
                This will replace all current questions with the default questionnaire. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetToDefaults}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-muted-foreground mb-6">
        Configure the qualification questions shown to agents. Each question can be mapped to a form field for data collection.
      </p>

      <Accordion type="multiple" defaultValue={config.sections.map(s => s.id)} className="space-y-4">
        {config.sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-semibold">{section.title}</span>
                <Badge variant={section.enabled ? "default" : "secondary"}>
                  {section.enabled ? `${section.questions.filter(q => q.enabled).length} questions` : "Disabled"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6">
              <div className="space-y-4">
                {/* Section toggle */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div>
                    <Label>Enable Section</Label>
                    <p className="text-xs text-muted-foreground">Show this section in the qualification form</p>
                  </div>
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(enabled) => updateSection(section.id, { enabled })}
                  />
                </div>

                {/* Questions list */}
                <div className="space-y-3">
                  {section.questions
                    .sort((a, b) => a.order - b.order)
                    .map((question, index) => (
                      <div
                        key={question.id}
                        className={`p-4 border rounded-lg ${!question.enabled ? 'opacity-60 bg-muted/50' : 'bg-card'}`}
                      >
                        {editingQuestion?.questionId === question.id ? (
                          // Edit mode
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Question Text</Label>
                              <Textarea
                                value={question.question}
                                onChange={(e) =>
                                  updateQuestion(section.id, question.id, { question: e.target.value })
                                }
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Map to Field</Label>
                              <Select
                                value={question.fieldName || "none"}
                                onValueChange={(value) =>
                                  updateQuestion(section.id, question.id, {
                                    fieldName: value === "none" ? null : value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a field to map" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No field mapping</SelectItem>
                                  {availableFields.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Mapped fields will show an input for the agent to fill in
                              </p>
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => setEditingQuestion(null)}>
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveQuestion(section.id, question.id, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveQuestion(section.id, question.id, 'down')}
                                disabled={index === section.questions.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{index + 1}. {question.question}</p>
                              {question.fieldName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  → Maps to: <code className="bg-muted px-1 rounded">{question.fieldName}</code>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={question.enabled}
                                onCheckedChange={(enabled) =>
                                  updateQuestion(section.id, question.id, { enabled })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditingQuestion({ sectionId: section.id, questionId: question.id })
                                }
                              >
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove this question from the questionnaire.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeQuestion(section.id, question.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {/* New question form */}
                  {newQuestion?.sectionId === section.id ? (
                    <div className="p-4 border-2 border-dashed rounded-lg space-y-4">
                      <div className="space-y-2">
                        <Label>New Question</Label>
                        <Textarea
                          value={newQuestion.text}
                          onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          placeholder="Enter your question..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Map to Field (optional)</Label>
                        <Select
                          value={newQuestion.fieldName || "none"}
                          onValueChange={(value) =>
                            setNewQuestion({ ...newQuestion, fieldName: value === "none" ? null : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a field to map" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No field mapping</SelectItem>
                            {availableFields.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setNewQuestion(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveNewQuestion} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add Question
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleAddQuestion(section.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </Button>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
};
