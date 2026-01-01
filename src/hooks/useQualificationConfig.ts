import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mysqlApi } from '@/lib/mysqlApi';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useGroup } from '@/contexts/GroupContext';
import { toast } from 'sonner';
import {
  QualificationConfig,
  DEFAULT_QUALIFICATION_CONFIG,
  deserializeConfig,
  serializeConfig,
  convertLegacyScriptsToConfig,
} from '@/config/qualificationConfig';

const CONFIG_KEY_PREFIX = 'qualification_config';

export const useQualificationConfig = () => {
  const { groupType } = useGroup();
  const queryClient = useQueryClient();
  
  const configKey = `${CONFIG_KEY_PREFIX}_${groupType}`;

  const { data: config, isLoading, error } = useQuery({
    queryKey: [...QUERY_KEYS.scripts.byStep(configKey)],
    queryFn: async (): Promise<QualificationConfig> => {
      try {
        // First try to load from new config format
        const configData = await mysqlApi.findOneByField<{ key_name: string; key_value: string }>(
          'homebound_app_settings',
          'key_name',
          configKey
        );

        if (configData?.key_value) {
          const parsed = deserializeConfig(configData.key_value);
          if (parsed) {
            return parsed;
          }
        }

        // Fallback: Try to load from legacy script format and convert
        const stepName = groupType === 'outbound' ? 'outbound_qualification' : 'qualification';
        const legacyData = await mysqlApi.findOneByField<{ step_name: string; content: string }>(
          'homebound_script',
          'step_name',
          stepName
        );

        if (legacyData?.content) {
          try {
            const parsed = JSON.parse(legacyData.content);
            if (parsed && typeof parsed === 'object' && ('property' in parsed || 'loan' in parsed || 'financial' in parsed)) {
              return convertLegacyScriptsToConfig(parsed);
            }
          } catch {
            // Invalid JSON, use defaults
          }
        }

        // Return default config
        return DEFAULT_QUALIFICATION_CONFIG;
      } catch (error) {
        console.error('Error loading qualification config:', error);
        return DEFAULT_QUALIFICATION_CONFIG;
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newConfig: QualificationConfig) => {
      const serialized = serializeConfig(newConfig);
      
      // Check if config exists
      const existing = await mysqlApi.findOneByField<{ id: number }>(
        'homebound_app_settings',
        'key_name',
        configKey
      );

      if (existing) {
        await mysqlApi.updateById('homebound_app_settings', existing.id, {
          key_value: serialized,
        });
      } else {
        await mysqlApi.create('homebound_app_settings', {
          key_name: configKey,
          key_value: serialized,
          key_type: 'json',
          description: `Qualification form config for ${groupType}`,
        });
      }

      return newConfig;
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData([...QUERY_KEYS.scripts.byStep(configKey)], newConfig);
      toast.success('Qualification config saved');
    },
    onError: (error) => {
      console.error('Error saving qualification config:', error);
      toast.error('Failed to save qualification config');
    },
  });

  const updateSection = (sectionId: string, updates: Partial<QualificationConfig['sections'][0]>) => {
    if (!config) return;

    const newConfig: QualificationConfig = {
      ...config,
      sections: config.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    };

    saveMutation.mutate(newConfig);
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<QualificationConfig['sections'][0]['questions'][0]>
  ) => {
    if (!config) return;

    const newConfig: QualificationConfig = {
      ...config,
      sections: config.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map(q =>
                q.id === questionId ? { ...q, ...updates } : q
              ),
            }
          : section
      ),
    };

    saveMutation.mutate(newConfig);
  };

  const addQuestion = (sectionId: string, question: Omit<QualificationConfig['sections'][0]['questions'][0], 'order'>) => {
    if (!config) return;

    const section = config.sections.find(s => s.id === sectionId);
    const maxOrder = section ? Math.max(...section.questions.map(q => q.order), 0) : 0;

    const newConfig: QualificationConfig = {
      ...config,
      sections: config.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              questions: [...s.questions, { ...question, order: maxOrder + 1 }],
            }
          : s
      ),
    };

    saveMutation.mutate(newConfig);
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    if (!config) return;

    const newConfig: QualificationConfig = {
      ...config,
      sections: config.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.filter(q => q.id !== questionId),
            }
          : s
      ),
    };

    saveMutation.mutate(newConfig);
  };

  const reorderQuestions = (sectionId: string, questionIds: string[]) => {
    if (!config) return;

    const newConfig: QualificationConfig = {
      ...config,
      sections: config.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map(q => ({
                ...q,
                order: questionIds.indexOf(q.id) + 1,
              })),
            }
          : s
      ),
    };

    saveMutation.mutate(newConfig);
  };

  const addSection = (section: Omit<QualificationConfig['sections'][0], 'questions'>) => {
    if (!config) return;

    const newConfig: QualificationConfig = {
      ...config,
      sections: [
        ...config.sections,
        {
          ...section,
          questions: [],
        },
      ],
    };

    saveMutation.mutate(newConfig);
  };

  const removeSection = (sectionId: string) => {
    if (!config) return;

    const newConfig: QualificationConfig = {
      ...config,
      sections: config.sections.filter(s => s.id !== sectionId),
    };

    saveMutation.mutate(newConfig);
  };

  const reorderSections = (sectionIds: string[]) => {
    if (!config) return;

    const sectionMap = new Map(config.sections.map(s => [s.id, s]));
    const newSections = sectionIds
      .map(id => sectionMap.get(id))
      .filter((s): s is QualificationConfig['sections'][0] => s !== undefined);

    const newConfig: QualificationConfig = {
      ...config,
      sections: newSections,
    };

    saveMutation.mutate(newConfig);
  };

  const resetToDefaults = () => {
    saveMutation.mutate(DEFAULT_QUALIFICATION_CONFIG);
  };

  return {
    config: config || DEFAULT_QUALIFICATION_CONFIG,
    isLoading,
    error: error ? (error as Error).message : null,
    isSaving: saveMutation.isPending,
    updateSection,
    updateQuestion,
    addQuestion,
    removeQuestion,
    reorderQuestions,
    addSection,
    removeSection,
    reorderSections,
    resetToDefaults,
    saveConfig: saveMutation.mutate,
  };
};
