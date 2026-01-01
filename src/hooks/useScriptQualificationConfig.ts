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

const STORAGE_KEY_PREFIX = "qualification_script_selected";

/**
 * Hook to get the script-specific qualification config.
 * This merges the master config with script-specific selections and local alternatives.
 */
export const useScriptQualificationConfig = () => {
  const { groupType } = useGroup();
  
  const stepName = groupType === "outbound" ? "outbound_qualification" : "qualification";
  const storageKey = `${STORAGE_KEY_PREFIX}_${stepName}`;
  const masterConfigKey = `qualification_config_${groupType}`;

  // Fetch master config
  const { data: masterConfig, isLoading: masterLoading } = useQuery({
    queryKey: ["qualification_master_config", groupType],
    queryFn: async (): Promise<QualificationConfig> => {
      try {
        const configData = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("homebound_app_settings", "setting_key", masterConfigKey);

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
  });

  // Fetch script-specific selections
  const { data: scriptSelections, isLoading: selectionsLoading } = useQuery({
    queryKey: QUERY_KEYS.scripts.byStep(storageKey),
    queryFn: async (): Promise<SelectedQuestion[]> => {
      try {
        const data = await mysqlApi.findOneByField<{
          setting_key: string;
          setting_value: string;
        }>("homebound_app_settings", "setting_key", storageKey);

        if (data?.setting_value) {
          return JSON.parse(data.setting_value);
        }
        return [];
      } catch (error) {
        console.error("Error loading script selections:", error);
        return [];
      }
    },
  });

  // Build the merged config for display
  const getMergedConfig = (): QualificationConfig => {
    if (!masterConfig) return DEFAULT_QUALIFICATION_CONFIG;
    
    // If no script selections, fall back to master config
    if (!scriptSelections || scriptSelections.length === 0) {
      return masterConfig;
    }

    // Group script selections by section
    const selectionsBySectionId = scriptSelections.reduce((acc, sel) => {
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
    scriptSelections.forEach((sel) => {
      if (processedSections.has(sel.sectionId)) return;
      processedSections.add(sel.sectionId);

      const sectionSelections = selectionsBySectionId[sel.sectionId] || [];
      const masterSection = masterConfig.sections.find((s) => s.id === sel.sectionId);

      // Build questions for this section
      const questions: QualificationQuestion[] = sectionSelections.map((selQ) => {
        // Find the master question for base data
        const masterQuestion = masterSection?.questions.find(
          (q) => q.id === selQ.questionId
        );

        // Merge alternatives: master alternatives + local alternatives
        const masterAlts = masterQuestion?.alternatives || [];
        const localAlts = selQ.localAlternatives || [];

        // Combine alternatives with source tracking
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
      version: masterConfig.version,
      sections: mergedSections,
    };
  };

  const isLoading = masterLoading || selectionsLoading;
  const hasScriptSelections = scriptSelections && scriptSelections.length > 0;

  return {
    config: getMergedConfig(),
    masterConfig: masterConfig || DEFAULT_QUALIFICATION_CONFIG,
    scriptSelections: scriptSelections || [],
    hasScriptSelections,
    isLoading,
  };
};
