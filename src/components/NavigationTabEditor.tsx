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

interface SortableTabItemProps {
  tab: CustomTab | { id: string; title: string; isDefault?: boolean };
  isDefault?: boolean;
  onRename: (id: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
}

function SortableTabItem({ tab, isDefault, onRename, onDelete }: SortableTabItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tab.title);
  // Get the ID for sorting - use tab_key for custom tabs, id for default tabs
  const sortableId = isDefault 
    ? (tab.id || '') 
    : ((tab as CustomTab).tab_key || tab.id?.toString() || '');
  
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
      onRename(tab.id?.toString() || tab.tab_key || tab.id || '', editTitle.trim());
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
      } ${isDefault ? 'opacity-75' : ''}`}
    >
      {!isDefault && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      {isDefault && (
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
          className={`flex-1 ${isDefault ? 'cursor-default' : 'cursor-pointer hover:text-primary'}`}
          onClick={() => !isDefault && setIsEditing(true)}
          title={isDefault ? 'Default tab (cannot be renamed)' : 'Click to rename'}
        >
          {tab.title}
        </span>
      )}
      
      {isDefault && (
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Default</span>
      )}
      
      {!isDefault && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          onClick={() => onDelete(tab.id?.toString() || tab.tab_key || '')}
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

  // Combine default sections and custom tabs
  const allTabs = useMemo(() => {
    const defaultTabs = defaultSections.map(section => ({
      id: section.id,
      title: section.title,
      isDefault: true,
    }));
    
    const customTabs = tabs.map(tab => ({
      ...tab,
      id: tab.tab_key,
      isDefault: false,
    }));
    
    return [...defaultTabs, ...customTabs];
  }, [defaultSections, tabs]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = allTabs.findIndex(tab => {
      const tabId = tab.isDefault ? (tab.id || '') : ((tab as CustomTab).tab_key || tab.id?.toString() || '');
      return tabId === active.id || tabId.toString() === active.id.toString();
    });
    const newIndex = allTabs.findIndex(tab => {
      const tabId = tab.isDefault ? (tab.id || '') : ((tab as CustomTab).tab_key || tab.id?.toString() || '');
      return tabId === over.id || tabId.toString() === over.id.toString();
    });
    
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
    const tabKeys = reorderedCustomTabs.map(t => (t as CustomTab).tab_key).filter(Boolean);
    if (tabKeys.length > 0) {
      // Use a single mutation to update all orders
      reorderTabs(reorderedCustomTabs[0].tab_key || '', newCustomIndex + defaultTabs.length);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    // Check if it's a default section or custom tab
    const isDefault = defaultSections.some(s => s.id === id);
    
    if (isDefault) {
      toast.info('Default tabs cannot be renamed from here. Use Settings to rename them.');
      return;
    }
    
    // Find the tab and update it
    const tab = tabs.find(t => t.tab_key === id || t.id?.toString() === id);
    if (tab && tab.id) {
      updateTabById(tab.id, { tab_title: newTitle });
    }
  };

  const handleDelete = (id: string) => {
    const tab = tabs.find(t => t.tab_key === id || t.id?.toString() === id);
    if (tab && tab.id) {
      if (window.confirm(`Delete tab "${tab.tab_title}"? This action cannot be undone.`)) {
        deleteTab(tab.id);
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
                  items={allTabs.map(tab => {
                    if (tab.isDefault) {
                      return tab.id || '';
                    }
                    return (tab as CustomTab).tab_key || tab.id?.toString() || '';
                  })}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {allTabs.map((tab) => {
                      const tabId = tab.isDefault 
                        ? (tab.id || '') 
                        : ((tab as CustomTab).tab_key || tab.id?.toString() || '');
                      return (
                        <SortableTabItem
                          key={tabId}
                          tab={tab}
                          isDefault={tab.isDefault}
                          onRename={handleRename}
                          onDelete={tab.isDefault ? undefined : handleDelete}
                        />
                      );
                    })}
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

