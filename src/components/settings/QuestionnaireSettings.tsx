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
import { toast } from "sonner";
import {
  Loader2,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  RotateCcw,
  FolderPlus,
  Pencil,
  ChevronDown,
  Shuffle,
  Copy,
} from "lucide-react";
import { QualificationQuestion, QualificationSection as SectionType, FieldType, FieldOption, QuestionVariant } from "@/config/qualificationConfig";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "select", label: "Dropdown / Radio" },
  { value: "currency", label: "Currency ($)" },
  { value: "percentage", label: "Percentage (%)" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
];

// Sortable Question Item Component
interface SortableQuestionProps {
  question: QualificationQuestion;
  index: number;
  sectionId: string;
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

  const [newOption, setNewOption] = useState("");
  const [newAlternative, setNewAlternative] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const currentOptions = question.fieldOptions || [];
    const optionValue = newOption.toLowerCase().replace(/\s+/g, '_');
    onUpdate({
      fieldOptions: [...currentOptions, { value: optionValue, label: newOption.trim() }]
    });
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = question.fieldOptions || [];
    onUpdate({
      fieldOptions: currentOptions.filter((_, i) => i !== index)
    });
  };

  const handleAddAlternative = () => {
    if (!newAlternative.trim()) return;
    const alternatives = question.alternatives || [];
    const newAlt: QuestionVariant = {
      id: `alt_${Date.now()}`,
      text: newAlternative.trim(),
      isDefault: false,
    };
    onUpdate({ alternatives: [...alternatives, newAlt] });
    setNewAlternative("");
  };

  const handleRemoveAlternative = (altId: string) => {
    const alternatives = question.alternatives || [];
    onUpdate({
      alternatives: alternatives.filter(alt => alt.id !== altId)
    });
  };

  const handleUpdateAlternative = (altId: string, text: string) => {
    const alternatives = question.alternatives || [];
    onUpdate({
      alternatives: alternatives.map(alt => 
        alt.id === altId ? { ...alt, text } : alt
      )
    });
  };

  const handleSetDefaultAlternative = (altId: string | null) => {
    const alternatives = question.alternatives || [];
    onUpdate({
      alternatives: alternatives.map(alt => ({
        ...alt,
        isDefault: alt.id === altId
      }))
    });
  };

  const getFieldTypeLabel = (type?: FieldType) => {
    return FIELD_TYPES.find(t => t.value === type)?.label || "Text";
  };

  const hasAlternatives = question.alternatives && question.alternatives.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg ${!question.enabled ? 'opacity-60 bg-muted/50' : 'bg-card'} ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      {isEditing ? (
        <div className="p-4 space-y-4">
          {/* Primary Question Text */}
          <div className="space-y-2">
            <Label>Primary Question</Label>
            <Textarea
              value={question.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              rows={2}
            />
          </div>

          {/* Alternative Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Alternative Questions
              </Label>
              {hasAlternatives && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Selection:</Label>
                  <Select
                    value={question.selectionMode || "default"}
                    onValueChange={(value) => onUpdate({ selectionMode: value as 'default' | 'random' })}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use Default</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Add alternative phrasings for this question. They can be randomly selected or you can set a default.
            </p>

            {/* List of alternatives */}
            <div className="space-y-2">
              {(question.alternatives || []).map((alt, idx) => (
                <div key={alt.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                  <span className="text-xs text-muted-foreground mt-2.5 w-6">#{idx + 1}</span>
                  <Textarea
                    value={alt.text}
                    onChange={(e) => handleUpdateAlternative(alt.id, e.target.value)}
                    className="flex-1 min-h-[60px]"
                    rows={2}
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      variant={alt.isDefault ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleSetDefaultAlternative(alt.isDefault ? null : alt.id)}
                      title={alt.isDefault ? "Remove as default" : "Set as default"}
                    >
                      {alt.isDefault ? "Default" : "Set Default"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAlternative(alt.id)}
                      className="text-destructive h-7 w-7"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new alternative */}
            <div className="flex items-start gap-2">
              <Textarea
                value={newAlternative}
                onChange={(e) => setNewAlternative(e.target.value)}
                placeholder="Add alternative question phrasing..."
                className="flex-1"
                rows={2}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddAlternative}
                disabled={!newAlternative.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Input Type & Required */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Input Type</Label>
              <Select
                value={question.inputType || "text"}
                onValueChange={(value) => onUpdate({ inputType: value as FieldType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Required</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={question.isRequired || false}
                  onCheckedChange={(isRequired) => onUpdate({ isRequired })}
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {question.isRequired ? "Required" : "Optional"}
                </span>
              </div>
            </div>
          </div>

          {/* Options for Select type */}
          {question.inputType === "select" && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {(question.fieldOptions || []).map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const options = [...(question.fieldOptions || [])];
                        options[idx] = { ...option, label: e.target.value };
                        onUpdate({ fieldOptions: options });
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add new option..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddOption}>
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                2-4 options display as radio buttons, 5+ as a dropdown
              </p>
            </div>
          )}

          {/* Placeholder & Help Text */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={question.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })}
                placeholder="e.g., Enter value..."
              />
            </div>
            <div className="space-y-2">
              <Label>Help Text</Label>
              <Input
                value={question.helpText || ""}
                onChange={(e) => onUpdate({ helpText: e.target.value || undefined })}
                placeholder="Additional guidance..."
              />
            </div>
          </div>

          {/* Zapier Field Name */}
          <div className="space-y-2">
            <Label>Zapier Field Name</Label>
            <Input
              value={question.zapierFieldName || ""}
              onChange={(e) => onUpdate({ zapierFieldName: e.target.value || undefined })}
              placeholder="e.g., property_value"
            />
            <p className="text-xs text-muted-foreground">
              This field name will be used in the Zapier webhook payload
            </p>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={onCancelEdit}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4">
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
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {getFieldTypeLabel(question.inputType)}
                </Badge>
                {question.isRequired && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
                {question.zapierFieldName && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Zapier: {question.zapierFieldName}
                  </Badge>
                )}
                {question.inputType === "select" && question.fieldOptions && (
                  <Badge variant="outline" className="text-xs">
                    {question.fieldOptions.length} options
                  </Badge>
                )}
                {hasAlternatives && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Shuffle className="h-3 w-3" />
                    {question.alternatives!.length} alternative{question.alternatives!.length > 1 ? 's' : ''}
                    {question.selectionMode === 'random' && ' (random)'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={question.enabled}
                onCheckedChange={(enabled) => onUpdate({ enabled })}
              />
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="h-3 w-3 mr-1" />
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
        </div>
      )}
    </div>
  );
};

// Sortable Section Component
interface SortableSectionProps {
  section: SectionType;
  children: React.ReactNode;
}

const SortableSection = ({ section, children }: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-primary rounded-lg' : ''}>
      <AccordionItem value={section.id} className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3 flex-1">
            <button
              className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="font-semibold">{section.title}</span>
            <Badge variant={section.enabled ? "default" : "secondary"}>
              {section.enabled
                ? `${section.questions.filter((q) => q.enabled).length} questions`
                : "Disabled"}
            </Badge>
          </div>
        </AccordionTrigger>
        {children}
      </AccordionItem>
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
    addSection,
    removeSection,
    reorderSections,
    resetToDefaults,
  } = useQualificationConfig();

  const [editingQuestion, setEditingQuestion] = useState<{
    sectionId: string;
    questionId: string;
  } | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState<{
    sectionId: string;
    text: string;
    inputType: FieldType;
  } | null>(null);
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", description: "" });

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

  const handleQuestionDragEnd = (event: DragEndEvent, sectionId: string) => {
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

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = config.sections.findIndex((s) => s.id === active.id);
      const newIndex = config.sections.findIndex((s) => s.id === over.id);

      const reorderedSections = arrayMove(config.sections, oldIndex, newIndex);
      const sectionIds = reorderedSections.map((s) => s.id);
      reorderSections(sectionIds);
    }
  };

  const handleAddQuestion = (sectionId: string) => {
    setNewQuestion({ sectionId, text: "", inputType: "text" });
  };

  const handleSaveNewQuestion = () => {
    if (!newQuestion || !newQuestion.text.trim()) {
      toast.error("Question text is required");
      return;
    }

    addQuestion(newQuestion.sectionId, {
      id: `${newQuestion.sectionId}_q${Date.now()}`,
      question: newQuestion.text.trim(),
      fieldName: null,
      enabled: true,
      inputType: newQuestion.inputType,
    });

    setNewQuestion(null);
  };

  const handleAddSection = () => {
    if (!newSection.title.trim()) {
      toast.error("Section title is required");
      return;
    }

    const sectionId = newSection.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check for duplicate IDs
    if (config.sections.some(s => s.id === sectionId)) {
      toast.error("A section with this name already exists");
      return;
    }

    addSection({
      id: sectionId,
      title: newSection.title.trim(),
      description: newSection.description.trim() || undefined,
      enabled: true,
    });

    setNewSection({ title: "", description: "" });
    setShowNewSection(false);
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowNewSection(true)}
          >
            <FolderPlus className="h-4 w-4" />
            Add Section
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Default Questions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace all current sections and questions with the default questionnaire. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefaults}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">
        Drag sections and questions to reorder. Create custom sections and map questions to form fields.
      </p>

      {/* New Section Form */}
      {showNewSection && (
        <Card className="p-4 mb-6 border-2 border-dashed border-primary/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            Create New Section
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Section Title *</Label>
              <Input
                value={newSection.title}
                onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                placeholder="e.g., Employment Information"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newSection.description}
                onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                placeholder="e.g., Gather details about employment status"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewSection(false);
                  setNewSection({ title: "", description: "" });
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddSection} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Section
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Sections with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={config.sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="multiple" defaultValue={config.sections.map((s) => s.id)} className="space-y-4">
            {config.sections.map((section) => {
              const sortedQuestions = [...section.questions].sort((a, b) => a.order - b.order);

              return (
                <SortableSection key={section.id} section={section}>
                  <AccordionContent className="pt-4 pb-6">
                    <div className="space-y-4">
                      {/* Section settings */}
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex-1">
                          {editingSection === section.id ? (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label>Section Title</Label>
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                  value={section.description || ""}
                                  onChange={(e) => updateSection(section.id, { description: e.target.value || undefined })}
                                  placeholder="Optional description"
                                />
                              </div>
                              <Button size="sm" onClick={() => setEditingSection(null)}>
                                Done
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div>
                                <Label>Enable Section</Label>
                                <p className="text-xs text-muted-foreground">
                                  {section.description || "Show this section in the qualification form"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSection(section.id)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={section.enabled}
                            onCheckedChange={(enabled) => updateSection(section.id, { enabled })}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Section?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the "{section.title}" section and all its questions. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeSection(section.id)}>
                                  Delete Section
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Questions list with drag and drop */}
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleQuestionDragEnd(event, section.id)}
                      >
                        <SortableContext
                          items={sortedQuestions.map((q) => q.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {sortedQuestions.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No questions yet. Add your first question below.
                              </p>
                            )}
                            {sortedQuestions.map((question, index) => (
                              <SortableQuestion
                                key={question.id}
                                question={question}
                                index={index}
                                sectionId={section.id}
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
                            <Label>Input Type</Label>
                            <Select
                              value={newQuestion.inputType}
                              onValueChange={(value) =>
                                setNewQuestion({
                                  ...newQuestion,
                                  inputType: value as FieldType,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
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
                </SortableSection>
              );
            })}
          </Accordion>
        </SortableContext>
      </DndContext>

      {config.sections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No sections yet. Create your first section to get started.</p>
        </div>
      )}
    </Card>
  );
};
