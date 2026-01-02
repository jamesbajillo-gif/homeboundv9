import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpielListEditor } from "@/components/settings/SpielListEditor";
import { QualificationScriptSelector } from "@/components/settings/QualificationScriptSelector";
import { ObjectionListEditor } from "@/components/settings/ObjectionListEditor";

const InboundScripts = () => {
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-bold text-foreground">Inbound Scripts</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="greeting" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="greeting">Greeting</TabsTrigger>
                <TabsTrigger value="qualification">Qualification</TabsTrigger>
                <TabsTrigger value="objection">Objections</TabsTrigger>
                <TabsTrigger value="closingNotInterested">Not Interested</TabsTrigger>
                <TabsTrigger value="closingSuccess">Success</TabsTrigger>
              </TabsList>

              <TabsContent value="greeting" className="mt-6">
                <SpielListEditor stepName="greeting" stepTitle="Opening Greeting" />
              </TabsContent>

              <TabsContent value="qualification" className="mt-6">
                <QualificationScriptSelector 
                  stepName="inbound_qualification" 
                  stepTitle="Qualification Questions" 
                />
              </TabsContent>

              <TabsContent value="objection" className="mt-6">
                <ObjectionListEditor stepName="objectionHandling" stepTitle="Common Objections" />
              </TabsContent>

              <TabsContent value="closingNotInterested" className="mt-6">
                <SpielListEditor stepName="closingNotInterested" stepTitle="Closing - Not Interested" />
              </TabsContent>

              <TabsContent value="closingSuccess" className="mt-6">
                <SpielListEditor stepName="closingSuccess" stepTitle="Closing - Success" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default InboundScripts;
