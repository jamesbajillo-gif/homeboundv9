import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpielListEditor } from "@/components/settings/SpielListEditor";
import { QualificationScriptSelector } from "@/components/settings/QualificationScriptSelector";
import { ObjectionListEditor } from "@/components/settings/ObjectionListEditor";
import { AddTabDialog } from "@/components/settings/AddTabDialog";
import { SortableTab } from "@/components/settings/SortableTab";
import { useCustomTabs } from "@/hooks/useCustomTabs";
import { useTabVisibility } from "@/hooks/useTabVisibility";
import { useTabOrder } from "@/hooks/useTabOrder";
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
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const OutboundScripts = () => {
  const navigate = useNavigate();
  const { tabs, isLoading, createTab, updateTab, deleteTab, isCreating, isDeleting } = useCustomTabs("outbound");
  const { isTabVisible, setTabVisibility, isUpdating: isVisibilityUpdating } = useTabVisibility("outbound");
  const { order, setTabOrder, getOrderedTabs, isLoading: isOrderLoading } = useTabOrder("outbound");
  
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; title: string } | null>(null);

  // Fixed tabs that can't be deleted
  const fixedTabs = [
    { key: "outbound_greeting", title: "Greeting", stepName: "outbound_greeting" },
    { key: "outbound_qualification", title: "Qualification", stepName: "outbound_qualification" },
    { key: "outbound_objection", title: "Objections", stepName: "outbound_objection" },
    { key: "outbound_closingNotInterested", title: "Not Interested", stepName: "outbound_closingNotInterested" },
    { key: "outbound_closingSuccess", title: "Success", stepName: "outbound_closingSuccess" },
  ];

  // Combine and order all tabs
  const allTabs = useMemo(() => {
    const customTabsMapped = tabs.map(t => ({ key: t.tab_key, title: t.tab_title, stepName: t.tab_key, isCustom: true }));
    const fixedTabsMapped = fixedTabs.map(t => ({ ...t, isCustom: false }));
    const combined = [...fixedTabsMapped, ...customTabsMapped];
    return getOrderedTabs(combined);
  }, [tabs, fixedTabs, getOrderedTabs]);

  const tabIds = useMemo(() => allTabs.map(t => t.key), [allTabs]);

  // DnD sensors
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tabIds.indexOf(active.id as string);
      const newIndex = tabIds.indexOf(over.id as string);
      
      const newOrder = [...tabIds];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      
      await setTabOrder(newOrder);
    }
  };

  const handleStartEdit = (tabKey: string, currentTitle: string) => {
    setEditingTab(tabKey);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = async (tabKey: string) => {
    if (editTitle.trim()) {
      await updateTab(tabKey, editTitle.trim());
    }
    setEditingTab(null);
    setEditTitle("");
  };

  const handleDeleteClick = (tabKey: string, tabTitle: string) => {
    setDeleteTarget({ key: tabKey, title: tabTitle });
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deleteTab(deleteTarget.key);
      setDeleteTarget(null);
    }
  };

  const defaultTab = allTabs[0]?.key || "outbound_greeting";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-none bg-background border-b p-4 sm:p-6 lg:px-8 lg:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Outbound Scripts</h1>
          </div>
          <AddTabDialog onAdd={createTab} isCreating={isCreating} />
        </div>
      </div>

      {isLoading || isOrderLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              <Tabs defaultValue={defaultTab} className="w-full">
                <ScrollArea className="w-full">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
                      <TabsList className="inline-flex w-auto min-w-full">
                        {allTabs.map((tab) => (
                          <SortableTab
                            key={tab.key}
                            id={tab.key}
                            title={tab.title}
                            isVisible={isTabVisible(tab.key)}
                            onVisibilityChange={(visible) => setTabVisibility(tab.key, visible)}
                            isVisibilityUpdating={isVisibilityUpdating}
                            isEditing={editingTab === tab.key}
                            editTitle={editTitle}
                            onEditTitleChange={setEditTitle}
                            onStartEdit={() => handleStartEdit(tab.key, tab.title)}
                            onSaveEdit={() => handleSaveEdit(tab.key)}
                            onCancelEdit={() => setEditingTab(null)}
                            onDelete={() => handleDeleteClick(tab.key, tab.title)}
                            isCustomTab={tab.isCustom}
                          />
                        ))}
                      </TabsList>
                    </SortableContext>
                  </DndContext>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Tab contents */}
                <TabsContent value="outbound_greeting" className="mt-6">
                  <SpielListEditor stepName="outbound_greeting" stepTitle="Opening Greeting" />
                </TabsContent>

                <TabsContent value="outbound_qualification" className="mt-6">
                  <QualificationScriptSelector 
                    stepName="outbound_qualification" 
                    stepTitle="Qualification Questions" 
                  />
                </TabsContent>

                <TabsContent value="outbound_objection" className="mt-6">
                  <ObjectionListEditor stepName="outbound_objection" stepTitle="Common Objections" />
                </TabsContent>

                <TabsContent value="outbound_closingNotInterested" className="mt-6">
                  <SpielListEditor stepName="outbound_closingNotInterested" stepTitle="Closing - Not Interested" />
                </TabsContent>

                <TabsContent value="outbound_closingSuccess" className="mt-6">
                  <SpielListEditor stepName="outbound_closingSuccess" stepTitle="Closing - Success" />
                </TabsContent>

                {/* Custom tab contents */}
                {tabs.map((tab) => (
                  <TabsContent key={tab.tab_key} value={tab.tab_key} className="mt-6">
                    <SpielListEditor stepName={tab.tab_key} stepTitle={tab.tab_title} />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}" tab?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tab and its content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OutboundScripts;
