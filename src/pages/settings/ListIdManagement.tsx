import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ListOrdered, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ListIdConfiguration } from "@/components/settings/ListIdConfiguration";
import { SettingsCampaignSelector } from "@/components/settings/SettingsCampaignSelector";
import { SpielListEditor } from "@/components/settings/SpielListEditor";
import { AddTabDialog } from "@/components/settings/AddTabDialog";
import { SortableTab } from "@/components/settings/SortableTab";
import { CopyFromGroupDialog } from "@/components/settings/CopyFromGroupDialog";
import { CopyFromListIdDialog } from "@/components/settings/CopyFromListIdDialog";
import { QualificationScriptSelector } from "@/components/settings/QualificationScriptSelector";
import { toast } from "sonner";
import { useListIdTabVisibility } from "@/hooks/useListIdTabVisibility";
import { useListIdTabOrder } from "@/hooks/useListIdTabOrder";
import { useListIdCustomTabs } from "@/hooks/useListIdCustomTabs";
import { useQueryClient } from "@tanstack/react-query";
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

const ListIdManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; title: string } | null>(null);

  // Hooks for tab management (only active when listId is selected)
  // Uses same pattern as Inbound/Outbound with separate visibility and order hooks
  const { isTabVisible, setTabVisibility, isLoading: visibilityLoading, isUpdating: isVisibilityUpdating } = useListIdTabVisibility(selectedListId);
  const { setTabOrder, getOrderedTabs, isLoading: orderLoading } = useListIdTabOrder(selectedListId);
  
  const { 
    tabs: customTabs, 
    isLoading: customTabsLoading, 
    createTab, 
    updateTab, 
    deleteTab, 
    isCreating, 
    isDeleting 
  } = useListIdCustomTabs(selectedListId);

  // Fixed tabs - qualification is always included by default
  const fixedTabs = [
    { key: "greeting", title: "Greeting", stepName: "greeting" },
    { key: "qualification", title: "Qualification", stepName: "qualification", isQuestionnaire: true },
  ];

  // Combine and order all tabs
  const allTabs = useMemo(() => {
    const customTabsMapped = customTabs.map(t => ({ 
      key: t.tab_key, 
      title: t.tab_title, 
      stepName: t.tab_key, 
      isCustom: true 
    }));
    const fixedTabsMapped = fixedTabs.map(t => ({ ...t, isCustom: false }));
    const combined = [...fixedTabsMapped, ...customTabsMapped];
    return getOrderedTabs(combined);
  }, [customTabs, fixedTabs, getOrderedTabs]);

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

  const defaultTab = allTabs[0]?.key || "greeting";
  const isTabsLoading = visibilityLoading || orderLoading || customTabsLoading;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Campaign Selector - At the very top */}
      <SettingsCampaignSelector />
      
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
            <h1 className="text-3xl font-bold text-foreground">List ID Configuration</h1>
          </div>
          {selectedListId && (
            <div className="flex items-center gap-2">
              <CopyFromGroupDialog 
                listId={selectedListId} 
                onCopyComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["list-script", selectedListId] });
                  queryClient.invalidateQueries({ queryKey: ["listid_tab_visibility", selectedListId] });
                  queryClient.invalidateQueries({ queryKey: ["listid_tab_order", selectedListId] });
                  queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", selectedListId] });
                }}
              />
              <CopyFromListIdDialog 
                targetListId={selectedListId} 
                onCopyComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["list-script", selectedListId] });
                  queryClient.invalidateQueries({ queryKey: ["listid_tab_visibility", selectedListId] });
                  queryClient.invalidateQueries({ queryKey: ["listid_tab_order", selectedListId] });
                  queryClient.invalidateQueries({ queryKey: ["listid_custom_tabs", selectedListId] });
                }}
              />
              <AddTabDialog onAdd={createTab} isCreating={isCreating} />
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Configure custom scripts for specific List IDs. When a call comes in with a matching 
                  List ID, these scripts will be used instead of the default scripts. If no List ID 
                  is provided or doesn't match, the system uses the default Inbound/Outbound scripts.
                </p>
              </CardContent>
            </Card>
            
            {/* List ID Selector Section */}
            <ListIdConfiguration 
              selectedListId={selectedListId}
              onSelectListId={setSelectedListId}
            />

            {/* Multi-Step Script Editor Section - Only show when List ID is selected */}
            {selectedListId ? (
              isTabsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
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

                  {/* Fixed tab contents - using same editors as Inbound/Outbound */}
                  <TabsContent value="greeting" className="mt-6">
                    <SpielListEditor
                      stepName="greeting"
                      stepTitle="Opening Greeting"
                      listId={selectedListId}
                    />
                  </TabsContent>

                  <TabsContent value="qualification" className="mt-6">
                    <QualificationScriptSelector 
                      stepName="qualification"
                      stepTitle="Qualification Form"
                      listId={selectedListId}
                    />
                  </TabsContent>

                  {/* Custom tab contents - using same SpielListEditor */}
                  {customTabs.map((tab) => (
                    <TabsContent key={tab.tab_key} value={tab.tab_key} className="mt-6">
                      <SpielListEditor
                        stepName={tab.tab_key}
                        stepTitle={tab.tab_title}
                        listId={selectedListId}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Select a List ID above to configure its scripts
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>

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

export default ListIdManagement;
