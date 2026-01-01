import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ListIdConfiguration } from "@/components/settings/ListIdConfiguration";
import { ListIdScriptEditor } from "@/components/settings/ListIdScriptEditor";
import { ListIdScriptEditorSectioned } from "@/components/settings/ListIdScriptEditorSectioned";

const ListIdManagement = () => {
  const navigate = useNavigate();
  const [selectedListId, setSelectedListId] = useState<string>("");

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-none bg-background border-b p-4 sm:p-6 lg:px-8 lg:py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">List ID Configuration</h1>
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
              <Tabs defaultValue="greeting" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="greeting">Greeting</TabsTrigger>
                  <TabsTrigger value="qualification">Qualification</TabsTrigger>
                  <TabsTrigger value="objectionHandling">Objections</TabsTrigger>
                  <TabsTrigger value="closingNotInterested">Not Interested</TabsTrigger>
                  <TabsTrigger value="closingSuccess">Success</TabsTrigger>
                </TabsList>

                <TabsContent value="greeting">
                  <ListIdScriptEditor
                    listId={selectedListId}
                    stepName="greeting"
                    stepTitle="Opening Greeting"
                  />
                </TabsContent>

                <TabsContent value="qualification">
                  <ListIdScriptEditorSectioned
                    listId={selectedListId}
                  />
                </TabsContent>

                <TabsContent value="objectionHandling">
                  <ListIdScriptEditor
                    listId={selectedListId}
                    stepName="objectionHandling"
                    stepTitle="Common Objections"
                  />
                </TabsContent>

                <TabsContent value="closingNotInterested">
                  <ListIdScriptEditor
                    listId={selectedListId}
                    stepName="closingNotInterested"
                    stepTitle="Closing - Not Interested"
                  />
                </TabsContent>

                <TabsContent value="closingSuccess">
                  <ListIdScriptEditor
                    listId={selectedListId}
                    stepName="closingSuccess"
                    stepTitle="Closing - Successful"
                  />
                </TabsContent>
              </Tabs>
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
    </div>
  );
};

export default ListIdManagement;
