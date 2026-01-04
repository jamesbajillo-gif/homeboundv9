import { useQuery } from "@tanstack/react-query";
import { mysqlApi } from "@/lib/mysqlApi";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useGroup } from "@/contexts/GroupContext";
import {
  QualificationConfig,
  QualificationSection,
  QualificationQuestion,
  DEFAULT_QUALIFICATION_CONFIG,
  deserializeConfig,
} from "@/config/qualificationConfig";

interface SelectedQuestionAlt {
  id: string;
  text: string;
  source?: "master" | "script";
}

interface SelectedQuestion {
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  questionText: string;
  alternatives?: SelectedQuestionAlt[];
  localAlternatives?: SelectedQuestionAlt[];
  zapierFieldName?: string;
  order: number;
}

interface ScriptQuestionAlt {
  id: number;
  script_name: string;
  question_id: string;
  alt_text: string;
  alt_order: number;
  is_default: number;
}

const STORAGE_KEY_PREFIX = "tmdebt_qualification_script_selected";

/**
 * Hook to get the script-specific qualification config.
 * This merges the master config with script-specific selections and database alternatives.
 * @param overrideScriptName - Optional script name to use instead of deriving from groupType
 * @param listId - Optional list ID to check for list ID-specific qualification configs
 */
export const useScriptQualificationConfig = (overrideScriptName?: string, listId?: string | null) => {
  const { groupType } = useGroup();
  
  // Use override script name if provided, otherwise derive from groupType
  const scriptName = overrideScriptName || (groupType === "outbound" ? "outbound_qualification" : "inbound_qualification");
  const stepName = overrideScriptName 
    ? (overrideScriptName.includes("outbound") ? "outbound_qualification" : "qualification")
    : (groupType === "outbound" ? "outbound_qualification" : "qualification");
  
  // Build storage key - check for list ID-specific config first if listId is provided
  // List ID configs use a simpler key pattern: listid_${listId} (matches ListIdQualificationSelector)
  // Fall back to stepName-specific key for default configs
  const storageKey = listId && listId !== '--A--list_id--B--'
    ? `tmdebt_qualification_script_selected_listid_${listId}`
    : `${STORAGE_KEY_PREFIX}_${stepName}`;
  
  // Determine group type from script name if override is provided
  const effectiveGroupType = overrideScriptName?.includes("outbound") ? "outbound" : groupType;
  const masterConfigKey = `tmdebt_qualification_config_${effectiveGroupType}`;

  // Fetch master config
  const { data: masterConfig, isLoading: masterLoading } = useQuery({
    queryKey: ["qualification_master_config", masterConfigKey],
    queryFn: async (): Promise<QualificationConfig> => {
      try {
        const configData = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("tmdebt_app_settings", "setting_key", masterConfigKey);

        if (configData?.setting_value) {
          const parsed = deserializeConfig(configData.setting_value);
          if (parsed) return parsed;
        }
        return DEFAULT_QUALIFICATION_CONFIG;
      } catch (error) {
        console.error("Error loading master config:", error);
        return DEFAULT_QUALIFICATION_CONFIG;
      }
    },
    staleTime: 30000, // 30 seconds - prevents unnecessary refetches
  });

  // Fetch script-specific selections
  const { data: scriptSelections, isLoading: selectionsLoading } = useQuery({
    queryKey: QUERY_KEYS.scripts.byStep(storageKey),
    queryFn: async (): Promise<SelectedQuestion[]> => {
      try {
        const data = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("tmdebt_app_settings", "setting_key", storageKey);

        if (data?.setting_value) {
          return JSON.parse(data.setting_value);
        }
        return [];
      } catch (error) {
        console.error("Error loading script selections:", error);
        return [];
      }
    },
    staleTime: 30000, // 30 seconds - prevents unnecessary refetches
  });

  // Fetch script-specific alternatives from dedicated table
  const { data: scriptAlternatives = [], isLoading: altsLoading } = useQuery({
    queryKey: [QUERY_KEYS.scripts.all, "question_alts", scriptName],
    queryFn: async (): Promise<ScriptQuestionAlt[]> => {
      try {
        const data = await mysqlApi.findByField<ScriptQuestionAlt>(
          "tmdebt_script_question_alts",
          "script_name",
          scriptName,
          { orderBy: "alt_order", order: "ASC" }
        );
        return data;
      } catch (error) {
        console.error("Error loading script alternatives:", error);
        return [];
      }
    },
    staleTime: 30000, // 30 seconds - prevents unnecessary refetches
  });

  // Build the merged config for display
  const getMergedConfig = (): QualificationConfig => {
    // If no script-specific selections exist, return empty config (not master default)
    if (!scriptSelections || scriptSelections.length === 0) {
      return {
        version: masterConfig?.version || "1.0.0",
        sections: [],
      };
    }
    
    if (!masterConfig) return { version: "1.0.0", sections: [] };
    
    // Build config from script selections
    const baseConfig = buildConfigFromSelections(masterConfig, scriptSelections);

    // Merge script alternatives into all questions
    return mergeScriptAlternatives(baseConfig, scriptAlternatives);
  };

  // Build config from script selections
  const buildConfigFromSelections = (
    master: QualificationConfig,
    selections: SelectedQuestion[]
  ): QualificationConfig => {
    // Group script selections by section
    const selectionsBySectionId = selections.reduce((acc, sel) => {
      if (!acc[sel.sectionId]) {
        acc[sel.sectionId] = [];
      }
      acc[sel.sectionId].push(sel);
      return acc;
    }, {} as Record<string, SelectedQuestion[]>);

    // Build merged sections from script selections
    const mergedSections: QualificationSection[] = [];
    const processedSections = new Set<string>();

    // Process in order of selections
    selections.forEach((sel) => {
      if (processedSections.has(sel.sectionId)) return;
      processedSections.add(sel.sectionId);

      const sectionSelections = selectionsBySectionId[sel.sectionId] || [];
      const masterSection = master.sections.find((s) => s.id === sel.sectionId);

      // Build questions for this section
      const questions: QualificationQuestion[] = sectionSelections.map((selQ) => {
        const masterQuestion = masterSection?.questions.find(
          (q) => q.id === selQ.questionId
        );

        // Merge alternatives: master alternatives + local alternatives
        const masterAlts = masterQuestion?.alternatives || [];
        const localAlts = selQ.localAlternatives || [];

        const mergedAlternatives = [
          ...masterAlts.map((alt) => ({ ...alt, source: "master" as const })),
          ...localAlts.map((alt) => ({
            id: alt.id,
            text: alt.text,
            isDefault: false,
            source: "script" as const,
          })),
        ];

        return {
          id: selQ.questionId,
          question: selQ.questionText,
          inputType: masterQuestion?.inputType || "text",
          fieldName: masterQuestion?.fieldName || null,
          fieldOptions: masterQuestion?.fieldOptions,
          isRequired: masterQuestion?.isRequired || false,
          placeholder: masterQuestion?.placeholder,
          helpText: masterQuestion?.helpText,
          zapierFieldName: selQ.zapierFieldName || masterQuestion?.zapierFieldName,
          enabled: true,
          order: selQ.order,
          alternatives: mergedAlternatives.length > 0 ? mergedAlternatives : undefined,
          selectionMode: masterQuestion?.selectionMode || "default",
        };
      });

      mergedSections.push({
        id: sel.sectionId,
        title: sel.sectionTitle,
        description: masterSection?.description,
        enabled: true,
        questions,
      });
    });

    return {
      version: master.version,
      sections: mergedSections,
    };
  };

  // Merge database script alternatives into config
  const mergeScriptAlternatives = (
    config: QualificationConfig,
    dbAlternatives: ScriptQuestionAlt[]
  ): QualificationConfig => {
    if (dbAlternatives.length === 0) return config;

    // Group alternatives by question_id
    const altsByQuestion = dbAlternatives.reduce((acc, alt) => {
      if (!acc[alt.question_id]) {
        acc[alt.question_id] = [];
      }
      acc[alt.question_id].push(alt);
      return acc;
    }, {} as Record<string, ScriptQuestionAlt[]>);

    return {
      ...config,
      sections: config.sections.map((section) => ({
        ...section,
        questions: section.questions.map((question) => {
          const scriptAlts = altsByQuestion[question.id] || [];
          if (scriptAlts.length === 0) return question;

          // Merge script alternatives with existing ones
          const existingAlts = question.alternatives || [];
          const newAlts = scriptAlts.map((alt) => ({
            id: `script_${alt.id}`,
            text: alt.alt_text,
            isDefault: alt.is_default === 1,
            source: "script" as const,
          }));

          return {
            ...question,
            alternatives: [...existingAlts, ...newAlts],
          };
        }),
      })),
    };
  };

  const isLoading = masterLoading || selectionsLoading || altsLoading;
  const hasScriptSelections = scriptSelections && scriptSelections.length > 0;

  return {
    config: getMergedConfig(),
    masterConfig: masterConfig || DEFAULT_QUALIFICATION_CONFIG,
    scriptSelections: scriptSelections || [],
    scriptAlternatives,
    hasScriptSelections,
    isLoading,
    scriptName,
  };
};
