import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpielListEditor } from "@/components/settings/SpielListEditor";
import { AddTabDialog } from "@/components/settings/AddTabDialog";
import { SortableTab } from "@/components/settings/SortableTab";
import { QualificationForm } from "@/components/QualificationForm";
import { QualificationScriptSelector } from "@/components/settings/QualificationScriptSelector";
import { SettingsCampaignSelector } from "@/components/settings/SettingsCampaignSelector";
import { useCustomTabs } from "@/hooks/useCustomTabs";
import { useTabVisibility } from "@/hooks/useTabVisibility";
import { useTabOrder } from "@/hooks/useTabOrder";
import { getAppSetting, setAppSetting } from "@/lib/migration";
import { mysqlApi } from "@/lib/mysqlApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Get custom title for qualification tab
  const qualificationTitleKey = "tmdebt_qualification_tab_title_outbound";
  const queryClient = useQueryClient();
  const { data: qualificationCustomTitle } = useQuery({
    queryKey: ["qualification_tab_title", qualificationTitleKey],
    queryFn: async () => {
      const title = await getAppSetting(qualificationTitleKey);
      return title || null;
    },
  });

  // Mutation to update qualification tab title
  const updateQualificationTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (newTitle.trim()) {
        await setAppSetting(qualificationTitleKey, newTitle.trim(), "string", "Custom title for qualification tab");
      } else {
        // Delete the setting to revert to default
        const { deleteAppSetting } = await import("@/lib/migration");
        await deleteAppSetting(qualificationTitleKey);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qualification_tab_title", qualificationTitleKey] });
    },
  });

  // Fixed tabs that can't be deleted
  const fixedTabs = useMemo(() => [
    { key: "outbound_greeting", title: "Greeting", stepName: "outbound_greeting" },
    { 
      key: "outbound_qualification", 
      title: qualificationCustomTitle || "Qualification", 
      stepName: "outbound_qualification", 
      isQuestionnaire: true 
    },
  ], [qualificationCustomTitle]);

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
      // Check if this is the qualification tab (fixed tab)
      if (tabKey === "outbound_qualification") {
        await updateQualificationTitleMutation.mutateAsync(editTitle.trim());
      } else {
        await updateTab(tabKey, editTitle.trim());
      }
    }
    setEditingTab(null);
    setEditTitle("");
  };

  const handleDuplicateQualification = async () => {
    try {
      // Create a custom tab with questionnaire type
      const duplicateTitle = `${qualificationCustomTitle || "Qualification"} (Copy)`;
      await createTab(
        duplicateTitle,
        "questionnaire",
        "outbound_qualification",
        undefined // All sections by default
      );
      toast.success("Qualification tab duplicated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate qualification tab");
    }
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

  // Get scroll container element
  const getScrollContainer = (): HTMLElement | null => {
    if (!scrollAreaRef.current) return null;
    // Radix ScrollArea viewport selector
    return scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
  };

  // Check scroll position and update arrow visibility
  const checkScrollPosition = () => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Scroll functions
  const scrollLeft = () => {
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Scroll to active tab
  const scrollToActiveTab = (tabKey: string) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer || !tabsListRef.current) return;
    
    // Find the tab element - it should have an id containing the tab key
    const tabElement = Array.from(tabsListRef.current.querySelectorAll('button[role="tab"]')).find(
      (btn) => btn.getAttribute('id')?.includes(tabKey) || btn.getAttribute('data-value') === tabKey
    ) as HTMLElement;
    
    if (tabElement) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const containerRect = scrollContainer.getBoundingClientRect();
        const tabRect = tabElement.getBoundingClientRect();
        
        // Check if tab is outside viewport
        if (tabRect.left < containerRect.left) {
          // Tab is to the left, scroll to show it
          scrollContainer.scrollTo({
            left: scrollContainer.scrollLeft + (tabRect.left - containerRect.left) - 10,
            behavior: 'smooth'
          });
        } else if (tabRect.right > containerRect.right) {
          // Tab is to the right, scroll to show it
          scrollContainer.scrollTo({
            left: scrollContainer.scrollLeft + (tabRect.right - containerRect.right) + 10,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // Check scroll position on mount and when tabs change
  useEffect(() => {
    // Delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      checkScrollPosition();
      const scrollContainer = getScrollContainer();
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', checkScrollPosition);
        // Also check on resize
        const resizeObserver = new ResizeObserver(checkScrollPosition);
        resizeObserver.observe(scrollContainer);
        
        return () => {
          scrollContainer.removeEventListener('scroll', checkScrollPosition);
          resizeObserver.disconnect();
        };
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [allTabs]);

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
            <h1 className="text-3xl font-bold text-foreground">Outbound Scripts</h1>
          </div>
          <AddTabDialog onAdd={createTab} isCreating={isCreating} groupType="outbound" />
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
              <Tabs defaultValue={defaultTab} className="w-full" onValueChange={(value) => {
                scrollToActiveTab(value);
              }}>
                <div className="relative">
                  {canScrollLeft && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md"
                      onClick={scrollLeft}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <ScrollArea ref={scrollAreaRef} className="w-full">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
                        <TabsList ref={tabsListRef} className="inline-flex w-auto min-w-full">
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
                              onDelete={tab.key === "outbound_qualification" ? undefined : () => handleDeleteClick(tab.key, tab.title)}
                              isCustomTab={tab.isCustom}
                              onDuplicate={tab.key === "outbound_qualification" ? handleDuplicateQualification : undefined}
                            />
                          ))}
                        </TabsList>
                      </SortableContext>
                    </DndContext>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                  {canScrollRight && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md"
                      onClick={scrollRight}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Tab contents */}
                <TabsContent value="outbound_greeting" className="mt-6">
                  <SpielListEditor stepName="outbound_greeting" stepTitle="Opening Greeting" />
                </TabsContent>

                <TabsContent value="outbound_qualification" className="mt-6">
                  <QualificationScriptSelector 
                    stepName="outbound_qualification"
                    stepTitle="Qualification Form"
                  />
                </TabsContent>

                {/* Custom tab contents */}
                {tabs.map((tab) => (
                  <TabsContent key={tab.tab_key} value={tab.tab_key} className="mt-6">
                    {tab.tab_type === "questionnaire" && tab.questionnaire_script_name ? (
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground mb-4">
                          Questionnaire Form: {tab.questionnaire_script_name}
                        </div>
                        <QualificationForm 
                          testMode={true} 
                          scriptName={tab.questionnaire_script_name}
                          selectedSectionIds={(() => {
                            if (!tab.selected_section_ids) return undefined;
                            try {
                              // If it's already an array, return it
                              if (Array.isArray(tab.selected_section_ids)) return tab.selected_section_ids;
                              // If it's a string, parse it
                              if (typeof tab.selected_section_ids === 'string') {
                                const parsed = JSON.parse(tab.selected_section_ids);
                                return Array.isArray(parsed) ? parsed : undefined;
                              }
                              return undefined;
                            } catch (error) {
                              console.error('Error parsing selected_section_ids:', error);
                              return undefined;
                            }
                          })()}
                        />
                      </div>
                    ) : (
                      <SpielListEditor stepName={tab.tab_key} stepTitle={tab.tab_title} />
                    )}
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
