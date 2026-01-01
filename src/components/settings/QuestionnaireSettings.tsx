import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
} from "lucide-react";
import { QualificationQuestion } from "@/config/qualificationConfig";

// Sortable Question Item Component
interface SortableQuestionProps {
  question: QualificationQuestion;
  index: number;
  sectionId: string;
  availableFields: { value: string; label: string }[];
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<QualificationQuestion>) => void;
  onRemove: () => void;
}

const SortableQuestion = ({
  question,
  index,
  sectionId,
  availableFields,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
}: SortableQuestionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg ${!question.enabled ? 'opacity-60 bg-muted/50' : 'bg-card'} ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      {isEditing ? (
        // Edit mode
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Textarea
              value={question.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Map to Field</Label>
            <Select
              value={question.fieldName || "none"}
              onValueChange={(value) =>
                onUpdate({ fieldName: value === "none" ? null : value })
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
            <Button size="sm" onClick={onCancelEdit}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="flex items-start gap-3">
          <button
            className="mt-1 cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {index + 1}. {question.question}
            </p>
            {question.fieldName && (
              <p className="text-xs text-muted-foreground mt-1">
                → Maps to: <code className="bg-muted px-1 rounded">{question.fieldName}</code>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={question.enabled}
              onCheckedChange={(enabled) => onUpdate({ enabled })}
            />
            <Button variant="ghost" size="sm" onClick={onEdit}>
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
                  <AlertDialogAction onClick={onRemove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
};

export const QuestionnaireSettings = () => {
  const {
    config,
    isLoading,
    isSaving,
    updateSection,
    updateQuestion,
    addQuestion,
    removeQuestion,
    reorderQuestions,
    resetToDefaults,
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get available fields that can be mapped to questions
  const availableFields = fields.map((f) => ({
    value: f.field_name,
    label: f.field_label,
  }));

  const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const section = config.sections.find((s) => s.id === sectionId);
      if (!section) return;

      const oldIndex = section.questions.findIndex((q) => q.id === active.id);
      const newIndex = section.questions.findIndex((q) => q.id === over.id);

      const reorderedQuestions = arrayMove(section.questions, oldIndex, newIndex);
      const questionIds = reorderedQuestions.map((q) => q.id);
      reorderQuestions(sectionId, questionIds);
    }
  };

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
        Drag and drop to reorder questions. Each question can be mapped to a form field for data collection.
      </p>

      <Accordion type="multiple" defaultValue={config.sections.map((s) => s.id)} className="space-y-4">
        {config.sections.map((section) => {
          const sortedQuestions = [...section.questions].sort((a, b) => a.order - b.order);

          return (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold">{section.title}</span>
                  <Badge variant={section.enabled ? "default" : "secondary"}>
                    {section.enabled
                      ? `${section.questions.filter((q) => q.enabled).length} questions`
                      : "Disabled"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4">
                  {/* Section toggle */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <Label>Enable Section</Label>
                      <p className="text-xs text-muted-foreground">
                        Show this section in the qualification form
                      </p>
                    </div>
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={(enabled) => updateSection(section.id, { enabled })}
                    />
                  </div>

                  {/* Questions list with drag and drop */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, section.id)}
                  >
                    <SortableContext
                      items={sortedQuestions.map((q) => q.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {sortedQuestions.map((question, index) => (
                          <SortableQuestion
                            key={question.id}
                            question={question}
                            index={index}
                            sectionId={section.id}
                            availableFields={availableFields}
                            isEditing={editingQuestion?.questionId === question.id}
                            onEdit={() =>
                              setEditingQuestion({
                                sectionId: section.id,
                                questionId: question.id,
                              })
                            }
                            onCancelEdit={() => setEditingQuestion(null)}
                            onUpdate={(updates) =>
                              updateQuestion(section.id, question.id, updates)
                            }
                            onRemove={() => removeQuestion(section.id, question.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* New question form */}
                  {newQuestion?.sectionId === section.id ? (
                    <div className="p-4 border-2 border-dashed rounded-lg space-y-4">
                      <div className="space-y-2">
                        <Label>New Question</Label>
                        <Textarea
                          value={newQuestion.text}
                          onChange={(e) =>
                            setNewQuestion({ ...newQuestion, text: e.target.value })
                          }
                          placeholder="Enter your question..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Map to Field (optional)</Label>
                        <Select
                          value={newQuestion.fieldName || "none"}
                          onValueChange={(value) =>
                            setNewQuestion({
                              ...newQuestion,
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
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNewQuestion(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNewQuestion}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
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
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
};
