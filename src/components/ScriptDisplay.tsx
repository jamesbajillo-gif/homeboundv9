import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QualificationForm } from "@/components/QualificationForm";
import { mysqlApi } from "@/lib/mysqlApi";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { useGroup } from "@/contexts/GroupContext";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";

type ScriptStep = "greeting" | "qualification" | "objectionHandling" | "closingNotInterested" | "closingSuccess";

interface ScriptDisplayProps {
  currentStep: ScriptStep;
  onStepChange: (step: ScriptStep) => void;
  onQualificationSubmitRef?: (submitFn: () => void) => void;
}

export const ScriptDisplay = ({ currentStep, onStepChange, onQualificationSubmitRef }: ScriptDisplayProps) => {
  const [scriptData, setScriptData] = useState<Record<ScriptStep, { title: string; content: string }> | null>(null);
  const [usingListIdScripts, setUsingListIdScripts] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeListName, setActiveListName] = useState<string | null>(null);
  const { groupType } = useGroup();
  const { leadData } = useVICI();
  const viciListId = leadData?.list_id;

  // Fetch scripts using React Query - auto-refreshes when cache is invalidated
  const { data: fetchedScriptData, isLoading: loading } = useQuery({
    queryKey: ['scripts', 'display', groupType, viciListId],
    queryFn: async () => {
      return await fetchScriptDataInternal();
    },
    enabled: !!groupType,
    staleTime: 0, // Always refetch to get latest data
  });

  // Update local state when React Query data changes
  useEffect(() => {
    if (fetchedScriptData) {
      setScriptData(fetchedScriptData.scripts);
      setUsingListIdScripts(fetchedScriptData.usingListIdScripts);
      setActiveListId(fetchedScriptData.activeListId);
      setActiveListName(fetchedScriptData.activeListName);
    }
  }, [fetchedScriptData]);

  // Helper: Check if all 5 required script steps are present
  const isCompleteScriptSet = (scripts: Record<string, any>) => {
    const requiredSteps: ScriptStep[] = [
      'greeting',
      'qualification',
      'objectionHandling',
      'closingNotInterested',
      'closingSuccess'
    ];
    return requiredSteps.every(step => scripts[step]);
  };

  // Helper: Load default scripts based on group type
  const loadDefaultScripts = async () => {
    const prefix = groupType === "outbound" ? "outbound_" : "";
    const stepMapping: Record<ScriptStep, string> = {
      greeting: `${prefix}greeting`,
      objectionHandling: `${prefix}${groupType === "outbound" ? "objection" : "objectionHandling"}`,
      qualification: `${prefix}qualification`,
      closingNotInterested: `${prefix}closingNotInterested`,
      closingSuccess: `${prefix}closingSuccess`,
    };

    const defaultData = await mysqlApi.findByFieldIn<{
      step_name: string;
      title: string;
      content: string;
    }>(
      "homebound_script",
      "step_name",
      Object.values(stepMapping)
    );

    return defaultData.reduce((acc, item) => {
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
  };

  const fetchScriptDataInternal = async () => {
    const viciListId = leadData?.list_id;
    
    // OPTIMIZATION: Check List ID first
    if (viciListId && !viciListId.includes('--A--')) {
      // Load List ID scripts FIRST
      const listScripts = await mysqlApi.findByField<{
        step_name: string;
        title: string;
        content: string;
        name: string;
      }>(
        "homebound_list_id_config",
        "list_id",
        viciListId
      );
      
      if (listScripts && listScripts.length > 0) {
        const displayName = listScripts[0]?.name || viciListId;
        
        // Format List ID scripts
        const listIdScripts = listScripts.reduce((acc, item) => {
          const stepKey = item.step_name as ScriptStep;
          if (stepKey) {
            acc[stepKey] = {
              title: item.title,
              content: item.content,
            };
          }
          return acc;
        }, {} as Record<ScriptStep, { title: string; content: string }>);
        
        // CHECK: Do we have ALL required scripts?
        if (isCompleteScriptSet(listIdScripts)) {
          return {
            scripts: listIdScripts,
            usingListIdScripts: true,
            activeListId: viciListId,
            activeListName: displayName,
          };
        } else {
          // Continue to load defaults and merge (hybrid mode)
          const defaultScripts = await loadDefaultScripts();
          const mergedScripts = { ...defaultScripts, ...listIdScripts };
          
          return {
            scripts: mergedScripts,
            usingListIdScripts: true,
            activeListId: viciListId,
            activeListName: displayName,
          };
        }
      }
    }
    
    // FALLBACK: Load defaults (no List ID or not found)
    const defaultScripts = await loadDefaultScripts();
    return {
      scripts: defaultScripts,
      usingListIdScripts: false,
      activeListId: null,
      activeListName: null,
    };
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
        {/* List ID Script Indicator Badge */}
      {usingListIdScripts && activeListId && activeListName && (
        <div className="mb-3 animate-fade-in">
          <Badge variant="secondary" className="text-xs font-medium">
            <span className="font-bold">{activeListId} - {activeListName}</span>
          </Badge>
        </div>
      )}
        
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
