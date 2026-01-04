import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, GripVertical, X, Save, Settings } from 'lucide-react';
import { useCustomTabs, CustomTab } from '@/hooks/useCustomTabs';
import { toast } from 'sonner';
import { useVICI } from '@/contexts/VICIContext';
import { getUserId } from '@/lib/userHistory';
import { isManagerUserSync } from '@/lib/managerUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NavigationTabEditorProps {
  groupType: 'inbound' | 'outbound';
  defaultSections: Array<{ id: string; title: string }>;
  onSave?: () => void;
}

// Unified tab type for the editor
interface EditorTab {
  id: string;
  title: string;
  isDefault: boolean;
  tabKey?: string; // For custom tabs
  originalTab?: CustomTab; // Reference to original CustomTab for updates
}

interface SortableTabItemProps {
  tab: EditorTab;
  onRename: (id: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
}

function SortableTabItem({ tab, onRename, onDelete }: SortableTabItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tab.title);
  const sortableId = tab.id;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      onRename(tab.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(tab.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 border rounded-lg bg-background transition-all ${
        isDragging ? 'shadow-lg border-primary' : 'hover:border-primary/50'
      } ${tab.isDefault ? 'opacity-75' : ''}`}
    >
      {!tab.isDefault && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      {tab.isDefault && (
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        </div>
      )}
      
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 ${tab.isDefault ? 'cursor-default' : 'cursor-pointer hover:text-primary'}`}
          onClick={() => !tab.isDefault && setIsEditing(true)}
          title={tab.isDefault ? 'Default tab (cannot be renamed)' : 'Click to rename'}
        >
          {tab.title}
        </span>
      )}
      
      {tab.isDefault && (
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Default</span>
      )}
      
      {!tab.isDefault && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          onClick={() => onDelete(tab.id)}
          title="Delete tab"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export const NavigationTabEditor = ({ groupType, defaultSections, onSave }: NavigationTabEditorProps) => {
  const { leadData } = useVICI();
  const currentUserId = getUserId(leadData);
  const isManager = isManagerUserSync(currentUserId);
  const [open, setOpen] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  
  const { tabs, isLoading, createTab, updateTabById, deleteTab, reorderTabs } = useCustomTabs(groupType);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Combine default sections and custom tabs into unified EditorTab format
  const allTabs = useMemo((): EditorTab[] => {
    const defaultTabs: EditorTab[] = defaultSections.map(section => ({
      id: section.id,
      title: section.title,
      isDefault: true,
    }));
    
    const customTabsList: EditorTab[] = tabs.map(tab => ({
      id: tab.tab_key,
      title: tab.tab_title,
      isDefault: false,
      tabKey: tab.tab_key,
      originalTab: tab,
    }));
    
    return [...defaultTabs, ...customTabsList];
  }, [defaultSections, tabs]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = allTabs.findIndex(tab => tab.id === active.id || tab.id === active.id.toString());
    const newIndex = allTabs.findIndex(tab => tab.id === over.id || tab.id === over.id.toString());
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Don't allow moving default tabs
    const draggedTab = allTabs[oldIndex];
    if (draggedTab.isDefault) {
      toast.info('Default tabs cannot be reordered');
      return;
    }
    
    // Don't allow dropping custom tabs before default tabs
    const targetTab = allTabs[newIndex];
    if (targetTab.isDefault && newIndex < oldIndex) {
      toast.info('Cannot move custom tabs before default tabs');
      return;
    }
    
    // Separate default and custom tabs
    const defaultTabs = allTabs.filter(t => t.isDefault);
    const customTabs = allTabs.filter(t => !t.isDefault);
    
    // Calculate indices within custom tabs only
    const oldCustomIndex = oldIndex - defaultTabs.length;
    let newCustomIndex = newIndex - defaultTabs.length;
    
    // If dropping on a default tab, place after it
    if (targetTab.isDefault) {
      newCustomIndex = newIndex - defaultTabs.length + 1;
    }
    
    if (oldCustomIndex < 0 || newCustomIndex < 0 || newCustomIndex > customTabs.length) {
      return;
    }
    
    // Reorder custom tabs
    const reorderedCustomTabs = arrayMove(customTabs, oldCustomIndex, newCustomIndex);
    
    // Update display_order for all custom tabs in one batch
    const firstTab = reorderedCustomTabs[0];
    if (firstTab && firstTab.tabKey) {
      reorderTabs(firstTab.tabKey, newCustomIndex + defaultTabs.length);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    // Check if it's a default section or custom tab
    const editorTab = allTabs.find(t => t.id === id);
    
    if (!editorTab || editorTab.isDefault) {
      toast.info('Default tabs cannot be renamed from here. Use Settings to rename them.');
      return;
    }
    
    // Find the original tab and update it
    if (editorTab.originalTab && editorTab.originalTab.id) {
      updateTabById(editorTab.originalTab.id, { tab_title: newTitle });
    }
  };

  const handleDelete = (id: string) => {
    const editorTab = allTabs.find(t => t.id === id);
    if (editorTab && editorTab.originalTab && editorTab.originalTab.id) {
      if (window.confirm(`Delete tab "${editorTab.title}"? This action cannot be undone.`)) {
        deleteTab(editorTab.originalTab.id);
      }
    }
  };

  const handleAddTab = async () => {
    if (!newTabTitle.trim()) {
      toast.error('Tab title cannot be empty');
      return;
    }
    
    try {
      await createTab(newTabTitle.trim(), 'script', undefined, undefined);
      setNewTabTitle('');
    } catch (error) {
      console.error('Error creating tab:', error);
    }
  };

  if (!isManager) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          title="Edit Navigation Tabs (Manager)"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Navigation Tabs</DialogTitle>
          <DialogDescription>
            Manage navigation tabs for {groupType} scripts. Rename custom tabs, add new tabs, and reorder them by dragging. 
            Default tabs (Greeting, Qualification) cannot be renamed, deleted, or moved.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Add New Tab */}
          <div className="space-y-2">
            <Label htmlFor="new-tab-title">Add New Tab</Label>
            <div className="flex gap-2">
              <Input
                id="new-tab-title"
                placeholder="Enter tab title"
                value={newTabTitle}
                onChange={(e) => setNewTabTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTab();
                  }
                }}
              />
              <Button onClick={handleAddTab} disabled={!newTabTitle.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Tabs List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tabs</Label>
              <span className="text-xs text-muted-foreground">
                {allTabs.filter(t => !t.isDefault).length} custom tab{allTabs.filter(t => !t.isDefault).length !== 1 ? 's' : ''}
              </span>
            </div>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tabs...</div>
            ) : allTabs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No tabs found. Add a new tab above.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={allTabs.map(tab => tab.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {allTabs.map((tab) => (
                      <SortableTabItem
                        key={tab.id}
                        tab={tab}
                        onRename={handleRename}
                        onDelete={tab.isDefault ? undefined : handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {allTabs.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                💡 Changes are saved automatically. Drag custom tabs to reorder them.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

