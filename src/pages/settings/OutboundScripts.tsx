import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Trash2, Pencil, X, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpielListEditor } from "@/components/settings/SpielListEditor";
import { QualificationScriptSelector } from "@/components/settings/QualificationScriptSelector";
import { ObjectionListEditor } from "@/components/settings/ObjectionListEditor";
import { AddTabDialog } from "@/components/settings/AddTabDialog";
import { useCustomTabs } from "@/hooks/useCustomTabs";
import { useTabVisibility } from "@/hooks/useTabVisibility";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

  const handleStartEdit = (tabKey: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDeleteClick = (tabKey: string, tabTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ key: tabKey, title: tabTitle });
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deleteTab(deleteTarget.key);
      setDeleteTarget(null);
    }
  };

  const totalTabs = fixedTabs.length + tabs.length;

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

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              <Tabs defaultValue="outbound_greeting" className="w-full">
                <ScrollArea className="w-full">
                  <TabsList className={`inline-flex w-auto min-w-full`}>
                    {fixedTabs.map((tab) => (
                      <TabsTrigger key={tab.key} value={tab.key} className="flex-shrink-0 gap-2">
                        <Checkbox
                          checked={isTabVisible(tab.key)}
                          onCheckedChange={(checked) => setTabVisibility(tab.key, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isVisibilityUpdating}
                          className="h-3.5 w-3.5"
                        />
                        {tab.title}
                      </TabsTrigger>
                    ))}
                    {tabs.map((tab) => (
                      <TabsTrigger key={tab.tab_key} value={tab.tab_key} className="flex-shrink-0 group relative pr-8 gap-2">
                        <Checkbox
                          checked={isTabVisible(tab.tab_key)}
                          onCheckedChange={(checked) => setTabVisibility(tab.tab_key, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isVisibilityUpdating}
                          className="h-3.5 w-3.5"
                        />
                        {editingTab === tab.tab_key ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-6 w-24 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(tab.tab_key);
                                if (e.key === "Escape") setEditingTab(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleSaveEdit(tab.tab_key)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditingTab(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            {tab.tab_title}
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-0.5 hover:bg-muted rounded"
                                onClick={(e) => handleStartEdit(tab.tab_key, tab.tab_title, e)}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                className="p-0.5 hover:bg-destructive/20 rounded text-destructive"
                                onClick={(e) => handleDeleteClick(tab.tab_key, tab.tab_title, e)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Fixed tab contents */}
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
