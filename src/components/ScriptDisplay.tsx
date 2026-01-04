import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpielDisplay } from "@/components/SpielDisplay";
import { QualificationForm } from "@/components/QualificationForm";
import { mysqlApi } from "@/lib/mysqlApi";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Loader2, Phone, FileText, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useVICI } from "@/contexts/VICIContext";
import { replaceScriptVariables } from "@/lib/vici-parser";
import { useGroup } from "@/contexts/GroupContext";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { ScriptNavigation } from "./ScriptNavigation";
import { useTabVisibility } from "@/hooks/useTabVisibility";
import { useTabOrder } from "@/hooks/useTabOrder";
import { useCustomTabs } from "@/hooks/useCustomTabs";
import { useListIdTabVisibility } from "@/hooks/useListIdTabVisibility";
import { useListIdTabOrder } from "@/hooks/useListIdTabOrder";
import { useListIdCustomTabs } from "@/hooks/useListIdCustomTabs";

type ScriptStep = "greeting";

interface SectionConfig {
  id: string;
  visibilityKey: string;
  title: string;
  icon: typeof Phone;
  color: string;
  isCustom?: boolean;
  stepName?: string;
  isQuestionnaire?: boolean;
  questionnaireScriptName?: string;
  selectedSectionIds?: string[];
}

interface ScriptDisplayProps {
  onQualificationSubmitRef?: (submitFn: () => void) => void;
}

// Define the order and metadata for each section with visibility keys
const INBOUND_FIXED_SECTIONS: SectionConfig[] = [
  { id: "greeting", visibilityKey: "inbound_greeting", title: "Opening Spiel", icon: Phone, color: "text-blue-500", stepName: "greeting" },
  { 
    id: "qualification", 
    visibilityKey: "inbound_qualification", 
    title: "Qualification Form", 
    icon: ClipboardList, 
    color: "text-green-500", 
    stepName: "qualification",
    isQuestionnaire: true,
    questionnaireScriptName: "inbound_qualification"
  },
];

// Outbound section config with different visibility keys
const OUTBOUND_FIXED_SECTIONS: SectionConfig[] = [
  { id: "greeting", visibilityKey: "outbound_greeting", title: "Opening Spiel", icon: Phone, color: "text-blue-500", stepName: "outbound_greeting" },
  { 
    id: "qualification", 
    visibilityKey: "outbound_qualification", 
    title: "Qualification Form", 
    icon: ClipboardList, 
    color: "text-green-500", 
    stepName: "outbound_qualification",
    isQuestionnaire: true,
    questionnaireScriptName: "outbound_qualification"
  },
];

export const ScriptDisplay = ({ onQualificationSubmitRef }: ScriptDisplayProps) => {
  const [scriptData, setScriptData] = useState<Record<string, { title: string; content: string }> | null>(null);
  const [usingListIdScripts, setUsingListIdScripts] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeListName, setActiveListName] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { groupType } = useGroup();
  const { leadData } = useVICI();
  const viciListId = leadData?.list_id;
  
  // Get visibility, order, and custom tabs - use list ID specific hooks if list ID scripts are active
  // Note: We need to check usingListIdScripts, but it's set later. So we'll use both hooks conditionally
  // and switch based on the actual state after it's determined
  
  // Default (inbound/outbound) hooks
  const { isTabVisible: isTabVisibleDefault, isLoading: visibilityLoadingDefault } = useTabVisibility(groupType);
  const { getOrderedTabs: getOrderedTabsDefault, isLoading: orderLoadingDefault } = useTabOrder(groupType);
  const { tabs: customTabsDefault, isLoading: customTabsLoadingDefault } = useCustomTabs(groupType);
  
  // List ID specific hooks (only enabled when we have a valid list ID)
  const validListId = viciListId && !viciListId.includes('--A--') ? viciListId : null;
  const { isTabVisible: isTabVisibleListId, isLoading: visibilityLoadingListId } = useListIdTabVisibility(validListId || "");
  const { getOrderedTabs: getOrderedTabsListId, isLoading: orderLoadingListId } = useListIdTabOrder(validListId || "");
  const { tabs: customTabsListId, isLoading: customTabsLoadingListId } = useListIdCustomTabs(validListId || "");
  
  // Get the fixed section config based on group type
  const fixedSections = groupType === "outbound" ? OUTBOUND_FIXED_SECTIONS : INBOUND_FIXED_SECTIONS;
  
  // Helper function to safely parse selected_section_ids
  const parseSelectedSectionIds = (sectionIds: string | undefined): string[] | undefined => {
    if (!sectionIds) return undefined;
    try {
      // If it's already an array, return it
      if (Array.isArray(sectionIds)) return sectionIds;
      // If it's a string, try to parse it
      if (typeof sectionIds === 'string') {
        const parsed = JSON.parse(sectionIds);
        return Array.isArray(parsed) ? parsed : undefined;
      }
      return undefined;
    } catch (error) {
      console.error('Error parsing selected_section_ids:', error);
      return undefined;
    }
  };

  // Define fixed sections for list IDs (without inbound/outbound prefix)
  const LIST_ID_FIXED_SECTIONS: SectionConfig[] = [
    { id: "greeting", visibilityKey: "greeting", title: "Opening Spiel", icon: Phone, color: "text-blue-500", stepName: "greeting" },
    { 
      id: "qualification", 
      visibilityKey: "qualification", 
      title: "Qualification Form", 
      icon: ClipboardList, 
      color: "text-green-500", 
      stepName: "qualification",
      isQuestionnaire: true,
      questionnaireScriptName: "qualification"
    },
  ];

  // Determine which hooks to use based on whether we have a valid list ID
  // We'll check this early to determine which custom tabs to load
  const hasValidListId = viciListId && !viciListId.includes('--A--');
  
  // Use list ID hooks if we have a valid list ID, otherwise use default hooks
  // Note: We'll refine this after scripts are loaded to check if list ID scripts actually exist
  // For now, we'll use list ID hooks if we have a valid list ID
  const isTabVisibleHook = hasValidListId ? isTabVisibleListId : isTabVisibleDefault;
  const getOrderedTabsHook = hasValidListId ? getOrderedTabsListId : getOrderedTabsDefault;
  const customTabsHook = hasValidListId ? customTabsListId : customTabsDefault;
  const visibilityLoadingHook = hasValidListId ? visibilityLoadingListId : visibilityLoadingDefault;
  const orderLoadingHook = hasValidListId ? orderLoadingListId : orderLoadingDefault;
  const customTabsLoadingHook = hasValidListId ? customTabsLoadingListId : customTabsLoadingDefault;

  // Combine fixed and custom sections, then filter by visibility and order
  // Use hook versions initially for early rendering
  const initialVisibleSections = useMemo(() => {
    // Use list ID fixed sections if we have a valid list ID, otherwise use group type sections
    const sectionsToUse = hasValidListId ? LIST_ID_FIXED_SECTIONS : fixedSections;
    
    // Map custom tabs to section format
    const customSections: SectionConfig[] = customTabsHook.map(tab => ({
      id: tab.tab_key,
      visibilityKey: tab.tab_key,
      title: tab.tab_title,
      icon: FileText,
      color: "text-slate-500",
      isCustom: true,
      stepName: tab.tab_key,
      isQuestionnaire: tab.tab_type === "questionnaire",
      questionnaireScriptName: tab.questionnaire_script_name,
      selectedSectionIds: parseSelectedSectionIds(tab.selected_section_ids),
    }));
    
    // Combine all sections
    const allSections = [...sectionsToUse, ...customSections];
    
    // Filter by visibility
    const visible = allSections.filter(section => isTabVisibleHook(section.visibilityKey));
    
    // Map to have a 'key' property for getOrderedTabs
    const withKey = visible.map(s => ({ ...s, key: s.visibilityKey }));
    const ordered = getOrderedTabsHook(withKey);
    return ordered;
  }, [fixedSections, customTabsHook, isTabVisibleHook, getOrderedTabsHook, hasValidListId]);
  
  // Use initialVisibleSections for initial state, will be updated when finalVisibleSections is computed
  const [activeSection, setActiveSection] = useState<string>("greeting");

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

  // Update active section when visible sections change - use initialVisibleSections initially
  useEffect(() => {
    const sections = initialVisibleSections;
    if (sections.length > 0 && !sections.find(s => s.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [initialVisibleSections, activeSection]);

  // Track scroll position to update active section
  // Note: We use a ref to get the latest finalVisibleSections to avoid circular dependencies
  const finalVisibleSectionsRef = useRef<SectionConfig[]>([]);
  
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerHeight = container.offsetHeight;
      const scrollPosition = container.scrollTop + containerHeight / 3;
      
      const sections = finalVisibleSectionsRef.current.length > 0 ? finalVisibleSectionsRef.current : initialVisibleSections;
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element && element.offsetTop - container.offsetTop <= scrollPosition) {
          if (sections[i].id !== activeSection) {
            setActiveSection(sections[i].id);
          }
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeSection, initialVisibleSections]);

  // Keyboard navigation (up/down arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const sections = finalVisibleSectionsRef.current.length > 0 ? finalVisibleSectionsRef.current : initialVisibleSections;
      const currentIndex = sections.findIndex(s => s.id === activeSection);
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, sections.length - 1);
        handleNavigate(sections[nextIndex].id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        handleNavigate(sections[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, handleNavigate, initialVisibleSections]);

  // Fetch scripts using React Query - auto-refreshes when cache is invalidated or custom tabs change
  const { data: fetchedScriptData, isLoading: loading } = useQuery({
    queryKey: ['scripts', 'display', groupType, viciListId, customTabsHook.map(t => t.tab_key).join(',')],
    queryFn: async () => {
      return await fetchScriptDataInternal();
    },
    enabled: !!groupType && !customTabsLoadingHook,
    staleTime: 30000, // 30 seconds - prevents unnecessary refetches
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

  // Determine which hooks to use based on whether we're actually using list ID scripts
  // This is determined after scripts are loaded
  const isTabVisible = (usingListIdScripts && activeListId) ? isTabVisibleListId : isTabVisibleDefault;
  const getOrderedTabs = (usingListIdScripts && activeListId) ? getOrderedTabsListId : getOrderedTabsDefault;
  const customTabs = (usingListIdScripts && activeListId) ? customTabsListId : customTabsDefault;
  const visibilityLoading = (usingListIdScripts && activeListId) ? visibilityLoadingListId : visibilityLoadingDefault;
  const orderLoading = (usingListIdScripts && activeListId) ? orderLoadingListId : orderLoadingDefault;
  const customTabsLoading = (usingListIdScripts && activeListId) ? customTabsLoadingListId : customTabsLoadingDefault;

  // Recompute visibleSections when usingListIdScripts or activeListId changes
  // This ensures we use the correct tabs after scripts are loaded
  const finalVisibleSections = useMemo(() => {
    // Use list ID fixed sections if we're using list ID scripts, otherwise use group type sections
    const sectionsToUse = (usingListIdScripts && activeListId) ? LIST_ID_FIXED_SECTIONS : fixedSections;
    
    // Map custom tabs to section format
    const customSections: SectionConfig[] = customTabs.map(tab => ({
      id: tab.tab_key,
      visibilityKey: tab.tab_key,
      title: tab.tab_title,
      icon: FileText,
      color: "text-slate-500",
      isCustom: true,
      stepName: tab.tab_key,
      isQuestionnaire: tab.tab_type === "questionnaire",
      questionnaireScriptName: tab.questionnaire_script_name,
      selectedSectionIds: parseSelectedSectionIds(tab.selected_section_ids),
    }));
    
    // Combine all sections
    const allSections = [...sectionsToUse, ...customSections];
    
    // Filter by visibility
    const visible = allSections.filter(section => isTabVisible(section.visibilityKey));
    
    // Map to have a 'key' property for getOrderedTabs
    const withKey = visible.map(s => ({ ...s, key: s.visibilityKey }));
    const ordered = getOrderedTabs(withKey);
    return ordered;
  }, [fixedSections, customTabs, isTabVisible, getOrderedTabs, usingListIdScripts, activeListId]);

  // Keep ref updated with latest finalVisibleSections
  useEffect(() => {
    finalVisibleSectionsRef.current = finalVisibleSections;
  }, [finalVisibleSections]);

  // Use finalVisibleSections if available (after scripts load), otherwise use initialVisibleSections
  const visibleSections = finalVisibleSections.length > 0 ? finalVisibleSections : initialVisibleSections;

  // Helper: Check if required script step is present
  const isCompleteScriptSet = (scripts: Record<string, any>) => {
    const requiredSteps: ScriptStep[] = [
      'greeting'
    ];
    return requiredSteps.every(step => scripts[step]);
  };

  // Helper: Load default scripts based on group type (including custom tabs)
  const loadDefaultScripts = async () => {
    const prefix = groupType === "outbound" ? "outbound_" : "";
    const stepMapping: Record<string, string> = {
      greeting: `${prefix}greeting`,
    };
    
    // Add custom tab step names to fetch - use hook version since this is called before customTabs is defined
    const customStepNames = customTabsHook.map(tab => tab.tab_key);
    const allStepNames = [...Object.values(stepMapping), ...customStepNames];

    const defaultData = await mysqlApi.findByFieldIn<{
      step_name: string;
      title: string;
      content: string;
    }>(
      "tmdebt_script",
      "step_name",
      allStepNames
    );

    const result: Record<string, { title: string; content: string }> = {};
    
    // Map fixed tabs
    defaultData.forEach(item => {
      const stepEntry = Object.entries(stepMapping).find(([_, dbName]) => dbName === item.step_name);
      if (stepEntry) {
        const [stepKey] = stepEntry;
        result[stepKey] = {
          title: item.title,
          content: item.content,
        };
      }
      // Also map custom tabs by their tab_key
      if (customStepNames.includes(item.step_name)) {
        result[item.step_name] = {
          title: item.title,
          content: item.content,
        };
      }
    });
    
    return result;
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
        "tmdebt_list_id_config",
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

  if (loading || visibilityLoading || orderLoading || customTabsLoading) {
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

  if (visibleSections.length === 0) {
    return (
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-muted-foreground text-sm md:text-base">No script sections are visible. Configure visibility in Settings.</p>
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
          {visibleSections.map((section, index) => {
            const sectionData = scriptData?.[section.id];
            const Icon = section.icon;
            const processedContent = sectionData 
              ? replaceScriptVariables(sectionData.content, leadData) 
              : '';

            // Questionnaire sections don't need scriptData, they render QualificationForm
            if (!section.isQuestionnaire && !sectionData) return null;

            return (
              <div 
                key={section.id}
                id={section.id}
                className="min-h-full snap-start py-2"
              >
                <Card 
                  className="border-l-4 shadow-sm transition-all duration-300 min-h-[calc(100vh-200px)]"
                  style={{ borderLeftColor: `hsl(var(--primary))` }}
                >
                  <CardHeader className="pb-2 md:pb-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`p-1.5 md:p-2 rounded-lg bg-muted ${section.color}`}>
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] md:text-xs font-medium">
                            {index + 1} of {visibleSections.length}
                          </Badge>
                        </div>
                        <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground mt-1">
                          {section.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {section.isQuestionnaire && section.questionnaireScriptName ? (
                      <QualificationForm 
                        scriptName={section.questionnaireScriptName}
                        selectedSectionIds={section.selectedSectionIds}
                        listId={usingListIdScripts ? activeListId : undefined}
                      />
                    ) : section.id === "greeting" ? (
                      <SpielDisplay 
                        content={sectionData?.content || ""} 
                        stepName={section.stepName || "greeting"}
                        accentColor="border-blue-500"
                        listId={usingListIdScripts ? activeListId : null}
                        stepTitle={sectionData?.title || section.title}
                      />
                    ) : section.isCustom ? (
                      <SpielDisplay 
                        content={sectionData?.content || ""} 
                        stepName={section.stepName || section.id}
                        accentColor="border-slate-500"
                        listId={usingListIdScripts ? activeListId : null}
                        stepTitle={sectionData?.title || section.title}
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
          sections={visibleSections}
          activeSection={activeSection}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
};