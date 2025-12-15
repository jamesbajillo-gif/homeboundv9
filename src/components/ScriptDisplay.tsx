import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QualificationForm } from "@/components/QualificationForm";
import { mysqlApi } from "@/lib/mysql-api";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { useGroup } from "@/contexts/GroupContext";

type ScriptStep = "greeting" | "qualification" | "objectionHandling" | "closingNotInterested" | "closingSuccess";

interface ScriptDisplayProps {
  currentStep: ScriptStep;
  onStepChange: (step: ScriptStep) => void;
  onQualificationSubmitRef?: (submitFn: () => void) => void;
}

export const ScriptDisplay = ({ currentStep, onStepChange, onQualificationSubmitRef }: ScriptDisplayProps) => {
  const [scriptData, setScriptData] = useState<Record<ScriptStep, { title: string; content: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const { groupType } = useGroup();
  const { leadData } = useVICI();

  useEffect(() => {
    fetchScriptData();
  }, [groupType]);

  const fetchScriptData = async () => {
    try {
      // Map step names based on group type
      const prefix = groupType === "outbound" ? "outbound_" : "";
      const stepMapping: Record<ScriptStep, string> = {
        greeting: `${prefix}greeting`,
        objectionHandling: `${prefix}${groupType === "outbound" ? "objection" : "objectionHandling"}`,
        qualification: `${prefix}qualification`,
        closingNotInterested: `${prefix}closingNotInterested`,
        closingSuccess: `${prefix}closingSuccess`,
      };

      console.log("Fetching scripts for group:", groupType, "Step mapping:", stepMapping);

      const allScripts = await mysqlApi.fetchAll<{
        id: number;
        step_name: string;
        title: string;
        content: string;
      }>("homebound_script");

      // Filter to only include scripts we need
      const stepNames = Object.values(stepMapping);
      const data = allScripts.filter(script => stepNames.includes(script.step_name));

      if (data) {
        const formattedData = data.reduce((acc, item) => {
          // Find which step this belongs to
          const stepEntry = Object.entries(stepMapping).find(([_, dbName]) => dbName === item.step_name);
          if (stepEntry) {
            const [stepKey] = stepEntry;
            acc[stepKey as ScriptStep] = {
              title: item.title,
              content: item.content,
            };
          }
          return acc;
        }, {} as Record<ScriptStep, { title: string; content: string }>);

        console.log("Formatted script data:", formattedData);
        setScriptData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching script data:", error);
      toast.error("Failed to load script data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-2 sm:px-4 pb-4">
        <div className="max-w-full mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!scriptData) {
    return (
      <div className="px-2 sm:px-4 pb-4">
        <div className="max-w-full mx-auto">
          <p className="text-center text-muted-foreground text-sm">Failed to load script data.</p>
        </div>
      </div>
    );
  }

  const currentSection = scriptData[currentStep];
  
  // If current section doesn't exist, show error and fallback
  if (!currentSection) {
    return (
      <div className="px-2 sm:px-4 pb-4">
        <div className="max-w-full mx-auto">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Step Not Found</h2>
            <p className="text-muted-foreground mb-3 text-sm">
              The script step "{currentStep}" is not available in the database.
            </p>
            <p className="text-xs text-muted-foreground">
              Please run the database migration to add missing steps.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Replace bracketed placeholders with VICI data
  const processedContent = replaceScriptVariables(currentSection.content, leadData);

  const currentIndex = Object.keys(scriptData).indexOf(currentStep);
  
  // Map step names to display titles
  const stepTitles: Record<ScriptStep, string> = {
    greeting: "Opening Spiel",
    qualification: "Qualification",
    objectionHandling: "Objection Handling",
    closingNotInterested: "Closing - Not Interested",
    closingSuccess: "Closing - Success"
  };
  
  return (
    <div className="px-2 sm:px-4 pb-2">
      <div className="max-w-full mx-auto">
        <div className="mb-2">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{stepTitles[currentStep]}</h1>
        </div>

        <ScrollArea className="h-[420px] [&>[data-radix-scroll-area-scrollbar]]:opacity-100">
          <div className="pr-3 pb-24">
            <div className="animate-fade-in pb-8">
              {currentStep === "qualification" ? (
                <>
                  <div className="prose prose-sm max-w-none mb-6">
                    <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-foreground">
                      {processedContent}
                    </pre>
                  </div>
                <QualificationForm 
                  onSubmitRef={onQualificationSubmitRef}
                  onComplete={() => onStepChange("closingSuccess")}
                />
                </>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-foreground">
                    {processedContent}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
