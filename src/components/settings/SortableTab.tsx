import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableTabProps {
  id: string;
  title: string;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  isVisibilityUpdating?: boolean;
  isEditing?: boolean;
  editTitle?: string;
  onEditTitleChange?: (title: string) => void;
  onStartEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onDelete?: () => void;
  isCustomTab?: boolean;
}

export function SortableTab({
  id,
  title,
  isVisible,
  onVisibilityChange,
  isVisibilityUpdating,
  isEditing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  isCustomTab,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <TabsTrigger
      ref={setNodeRef}
      style={style}
      value={id}
      className={cn(
        "flex-shrink-0 gap-1.5 group relative",
        isCustomTab && "pr-8",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      
      <Checkbox
        checked={isVisible}
        onCheckedChange={(checked) => onVisibilityChange(!!checked)}
        onClick={(e) => e.stopPropagation()}
        disabled={isVisibilityUpdating}
        className="h-3.5 w-3.5"
      />
      
      {isEditing ? (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Input
            value={editTitle}
            onChange={(e) => onEditTitleChange?.(e.target.value)}
            className="h-6 w-24 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit?.();
              if (e.key === "Escape") onCancelEdit?.();
            }}
          />
          <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={onSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          {title}
          {isCustomTab && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-0.5 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit?.();
                }}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                className="p-0.5 hover:bg-destructive/20 rounded text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </>
      )}
    </TabsTrigger>
  );
}
