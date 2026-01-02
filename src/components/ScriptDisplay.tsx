import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QualificationForm } from "@/components/QualificationForm";
import { ObjectionDisplay } from "@/components/ObjectionDisplay";
import { SpielDisplay } from "@/components/SpielDisplay";
import { mysqlApi } from "@/lib/mysqlApi";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Phone, ClipboardCheck, MessageSquare, XCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { useGroup } from "@/contexts/GroupContext";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { Separator } from "@/components/ui/separator";
import { ScriptNavigation } from "./ScriptNavigation";

type ScriptStep = "greeting" | "qualification" | "objectionHandling" | "closingNotInterested" | "closingSuccess";

interface ScriptDisplayProps {
  onQualificationSubmitRef?: (submitFn: () => void) => void;
}

// Define the order and metadata for each section
const SECTION_ORDER: { id: ScriptStep; title: string; icon: typeof Phone; color: string }[] = [
  { id: "greeting", title: "Opening Spiel", icon: Phone, color: "text-blue-500" },
  { id: "qualification", title: "Qualification", icon: ClipboardCheck, color: "text-purple-500" },
  { id: "objectionHandling", title: "Objection Handling", icon: MessageSquare, color: "text-amber-500" },
  { id: "closingNotInterested", title: "Closing - Not Interested", icon: XCircle, color: "text-red-500" },
  { id: "closingSuccess", title: "Closing - Success", icon: CheckCircle, color: "text-green-500" },
];

export const ScriptDisplay = ({ onQualificationSubmitRef }: ScriptDisplayProps) => {
  const [scriptData, setScriptData] = useState<Record<ScriptStep, { title: string; content: string }> | null>(null);
  const [usingListIdScripts, setUsingListIdScripts] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeListName, setActiveListName] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ScriptStep>(SECTION_ORDER[0].id);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { groupType } = useGroup();
  const { leadData } = useVICI();
  const viciListId = leadData?.list_id;

  // Handle navigation to a section (smooth scroll)
  const handleNavigate = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementTop = element.offsetTop - container.offsetTop;
      container.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Track scroll position to update active section
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerHeight = container.offsetHeight;
      const scrollPosition = container.scrollTop + containerHeight / 3;
      
      for (let i = SECTION_ORDER.length - 1; i >= 0; i--) {
        const element = document.getElementById(SECTION_ORDER[i].id);
        if (element && element.offsetTop - container.offsetTop <= scrollPosition) {
          if (SECTION_ORDER[i].id !== activeSection) {
            setActiveSection(SECTION_ORDER[i].id);
          }
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  // Keyboard navigation (up/down arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = SECTION_ORDER.findIndex(s => s.id === activeSection);
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, SECTION_ORDER.length - 1);
        handleNavigate(SECTION_ORDER[nextIndex].id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        handleNavigate(SECTION_ORDER[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, handleNavigate]);

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
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-4">
        <div className="max-w-5xl mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!scriptData) {
    return (
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-muted-foreground text-sm md:text-base">Failed to load script data.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-20 h-full">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        {/* List ID Script Indicator Badge */}
        {usingListIdScripts && activeListId && activeListName && (
          <div className="mb-4 md:mb-6 animate-fade-in shrink-0">
            <Badge variant="secondary" className="text-xs sm:text-sm font-medium">
              <span className="font-bold">{activeListId} - {activeListName}</span>
            </Badge>
          </div>
        )}

        {/* Vertical scroll container with snap */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto snap-y snap-mandatory h-[calc(100vh-180px)] md:h-[calc(100vh-200px)] scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {SECTION_ORDER.map((section, index) => {
            const sectionData = scriptData[section.id];
            const Icon = section.icon;
            const processedContent = sectionData 
              ? replaceScriptVariables(sectionData.content, leadData) 
              : '';

            if (!sectionData) return null;

            return (
              <div 
                key={section.id}
                id={section.id}
                className="min-h-full snap-start py-2"
              >
                <Card 
                  className="border-l-4 shadow-sm transition-all duration-300 min-h-[calc(100vh-200px)]"
                  style={{ borderLeftColor: `hsl(var(--${section.id === 'greeting' ? 'primary' : section.id === 'qualification' ? 'primary' : section.id === 'objectionHandling' ? 'warning' : section.id === 'closingNotInterested' ? 'destructive' : 'success'}))` }}
                >
                  <CardHeader className="pb-2 md:pb-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`p-1.5 md:p-2 rounded-lg bg-muted ${section.color}`}>
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] md:text-xs font-medium">
                            {index + 1} of {SECTION_ORDER.length}
                          </Badge>
                        </div>
                        <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground mt-1">
                          {section.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {section.id === "qualification" ? (
                      <>
                        <div className="prose prose-sm md:prose-base max-w-none mb-6 md:mb-8">
                          <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose text-foreground">
                            {processedContent}
                          </pre>
                        </div>
                        <Separator className="my-4 md:my-6" />
                        <QualificationForm 
                          onSubmitRef={onQualificationSubmitRef}
                        />
                      </>
                    ) : section.id === "objectionHandling" ? (
                      <ObjectionDisplay content={sectionData.content} />
                    ) : section.id === "greeting" ? (
                      <SpielDisplay 
                        content={sectionData.content} 
                        stepName="greeting"
                        accentColor="border-blue-500" 
                      />
                    ) : section.id === "closingNotInterested" ? (
                      <SpielDisplay 
                        content={sectionData.content} 
                        stepName="closingNotInterested"
                        accentColor="border-red-500" 
                      />
                    ) : section.id === "closingSuccess" ? (
                      <SpielDisplay 
                        content={sectionData.content} 
                        stepName="closingSuccess"
                        accentColor="border-green-500" 
                      />
                    ) : (
                      <div className="prose prose-sm md:prose-base max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base md:text-lg leading-relaxed md:leading-loose text-foreground">
                          {processedContent}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        
        {/* Fixed bottom navigation */}
        <ScriptNavigation
          sections={SECTION_ORDER}
          activeSection={activeSection}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
};
