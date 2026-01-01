import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuestionnaireSettings } from "@/components/settings/QuestionnaireSettings";
import { QualificationForm } from "@/components/QualificationForm";

const FormsSettings = () => {
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
          <h1 className="text-3xl font-bold text-foreground">Form Configuration</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="questionnaire" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="questionnaire">Questions & Fields</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="questionnaire" className="mt-6">
                <QuestionnaireSettings />
              </TabsContent>

              <TabsContent value="preview" className="mt-6">
                <QualificationForm testMode={true} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default FormsSettings;
