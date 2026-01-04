import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useScriptQualificationConfig } from "@/hooks/useScriptQualificationConfig";
import { useZapier } from "@/hooks/useZapier";
import { useVICI } from "@/contexts/VICIContext";
import { useGroup } from "@/contexts/GroupContext";
import { Card } from "@/components/ui/card";
import { getAppSetting, setAppSetting, deleteAppSetting } from "@/lib/migration";
import { logUserAction } from "@/lib/userHistory";
import { QualificationSection, VerifyDialog } from "./qualification";
import { getEnabledSections, QualificationQuestion, QualificationSection as QualificationSectionType } from "@/config/qualificationConfig";

interface QualificationFormProps {
  onComplete?: () => void;
  onSubmitRef?: (submitFn: () => void) => void;
  testMode?: boolean;
  scriptName?: string; // Optional script name to override default (e.g., for questionnaire tabs)
  selectedSectionIds?: string[]; // Optional array of section IDs to filter sections
  listId?: string | null; // Optional list ID for list ID-specific qualification configs
}

export const QualificationForm = ({ 
  onComplete, 
  onSubmitRef, 
  testMode = false, 
  scriptName,
  selectedSectionIds,
  listId
}: QualificationFormProps) => {
  const { config, isLoading: configLoading } = useScriptQualificationConfig(scriptName, listId);
  
  // Filter config to only show selected sections if provided
  const filteredConfig = selectedSectionIds && selectedSectionIds.length > 0
    ? {
        ...config,
        sections: config.sections.filter(section => selectedSectionIds.includes(section.id))
      }
    : config;
  const { sendToAllActiveWebhooks, loading: zapierLoading } = useZapier();
  const { leadData } = useVICI();
  const { groupType } = useGroup();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);
  
  // Section visibility toggles (for testMode with selectedSectionIds)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(() => {
    // Initialize with all selected sections visible
    if (selectedSectionIds && selectedSectionIds.length > 0) {
      return new Set(selectedSectionIds);
    }
    return new Set();
  });

  // Memoize enabled questions to prevent infinite loops
  const enabledQuestions = useMemo((): QualificationQuestion[] => {
    return filteredConfig.sections
      .filter(s => s.enabled)
      .flatMap(s => s.questions.filter(q => q.enabled));
  }, [filteredConfig]);

  // Build draft key based on listId and groupType
  const getDraftKey = useCallback(() => {
    const listId = leadData?.list_id && leadData.list_id !== '--A--list_id--B--'
      ? leadData.list_id
      : 'default';
    return `tmdebt_qualification_form_draft_${listId}_${groupType}`;
  }, [leadData?.list_id, groupType]);

  // Build dynamic schema from questions - memoized
  const schema = useMemo(() => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    enabledQuestions.forEach((question) => {
      const fieldName = question.id;
      
      if (question.inputType === 'email') {
        schemaFields[fieldName] = question.isRequired
          ? z.string().trim().email('Invalid email address').min(1, `This field is required`)
          : z.string().trim().email('Invalid email address').optional().or(z.literal(''));
      } else if (question.inputType === 'select') {
        schemaFields[fieldName] = question.isRequired
          ? z.string().min(1, `Please select an option`)
          : z.string().optional();
      } else {
        schemaFields[fieldName] = question.isRequired
          ? z.string().trim().min(1, `This field is required`)
          : z.string().trim().optional();
      }
    });

    return z.object(schemaFields);
  }, [enabledQuestions]);

  type FormData = z.infer<typeof schema>;

  // Memoize default values
  const defaultValues = useMemo(() => {
    return enabledQuestions.reduce((acc, question) => {
      acc[question.id] = '';
      return acc;
    }, {} as Record<string, any>);
  }, [enabledQuestions]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Debounce ref for API saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Record<string, any> | null>(null);
  const lastSavedRef = useRef<string>("");
  const isResettingRef = useRef(false);
  const configVersionRef = useRef<string>("");

  // Auto-save to API with debouncing (5 second delay to prevent API overload)
  const saveDraft = useCallback(async (data: Record<string, any>) => {
    // Skip if we're in the middle of a form reset
    if (isResettingRef.current) return;
    
    const draftKey = getDraftKey();
    const draftData = JSON.stringify(data);
    
    // Skip if data hasn't changed
    if (draftData === lastSavedRef.current) return;

    // Always save to localStorage immediately (it's local and fast)
    try {
      localStorage.setItem(draftKey, draftData);
      lastSavedRef.current = draftData;
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }

    // Debounce API saves - store pending data and reset timer
    pendingDataRef.current = data;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (pendingDataRef.current) {
        try {
          await setAppSetting(draftKey, JSON.stringify(pendingDataRef.current), 'json', `Qualification form draft`);
        } catch (error) {
          console.error('Error saving draft to API:', error);
        }
        pendingDataRef.current = null;
      }
    }, 5000); // 5 second debounce for API calls
  }, [getDraftKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draftKey = getDraftKey();
      isResettingRef.current = true;

      try {
        const apiDraft = await getAppSetting(draftKey);
        if (apiDraft) {
          const draft = JSON.parse(apiDraft);
          if (Object.keys(draft).length > 0) {
            lastSavedRef.current = JSON.stringify(draft);
            form.reset(draft);
            isResettingRef.current = false;
            return;
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }

      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (Object.keys(draft).length > 0) {
            lastSavedRef.current = savedDraft;
            form.reset(draft);
          }
        }
      } catch (error) {
        console.error('Error loading draft from localStorage:', error);
      }
      
      isResettingRef.current = false;
    };

    loadDraft();
  }, [getDraftKey, form]);

  // Auto-save on form value changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      saveDraft(value as Record<string, any>);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDraft]);

  // Get test values for questions
  const getTestValue = (question: QualificationQuestion) => {
    if (question.inputType === 'email') return 'test.user@example.com';
    if (question.inputType === 'currency') return '$100,000';
    if (question.inputType === 'percentage') return '6.5%';
    if (question.inputType === 'select' && question.fieldOptions?.length) {
      return question.fieldOptions[0].value;
    }
    return 'Test value';
  };

  // Update form defaults when config changes - with version tracking to prevent loops
  useEffect(() => {
    const configVersion = JSON.stringify(enabledQuestions.map(q => q.id));
    
    // Skip if config hasn't actually changed
    if (configVersion === configVersionRef.current && !testMode) return;
    configVersionRef.current = configVersion;
    
    isResettingRef.current = true;
    
    const defaults = enabledQuestions.reduce((acc, question) => {
      if (testMode && question.isRequired) {
        acc[question.id] = getTestValue(question);
      } else {
        acc[question.id] = '';
      }
      return acc;
    }, {} as Record<string, any>);

    form.reset(defaults);
    
    // Use setTimeout to ensure reset completes before allowing saves
    setTimeout(() => {
      isResettingRef.current = false;
    }, 100);
  }, [enabledQuestions, testMode, form]);

  const handleVerifyAndSubmit = () => {
    form.trigger().then((isValid) => {
      if (isValid) {
        const data = form.getValues();
        setFormData(data);
        setShowVerifyDialog(true);
      }
    });
  };

  const handleConfirmSubmit = async () => {
    const data = form.getValues();
    const questions = enabledQuestions;

    // Build Zapier payload
    const zapierPayload: Record<string, any> = {
      source_id: leadData.source_id || 'querystring',
      // Add VICI lead data
      first_name: leadData.first_name || '',
      last_name: leadData.last_name || '',
      email: leadData.email || '',
      phone: leadData.phone_number || '',
    };

    questions.forEach((question) => {
      const value = data[question.id];
      const zapierFieldName = question.zapierFieldName || question.id;

      if (question.inputType === 'currency' && value) {
        zapierPayload[zapierFieldName] = value.replace(/[$,]/g, '');
      } else {
        zapierPayload[zapierFieldName] = value || '';
      }
    });

    console.log('Qualification data:', zapierPayload);

    try {
      await sendToAllActiveWebhooks(zapierPayload);

      // Clear draft
      const draftKey = getDraftKey();
      try {
        await deleteAppSetting(draftKey);
        localStorage.removeItem(draftKey);
      } catch (error) {
        console.error('Error clearing draft:', error);
      }

      // Log user action
      logUserAction(
        leadData,
        'submitted',
        `Submitted qualification form for lead ${leadData.lead_id || 'unknown'}`,
        undefined,
        { leadId: leadData.lead_id, listId: leadData.list_id, groupType, testMode }
      ).catch(err => console.error('Failed to log user action:', err));

      toast.success(testMode ? 'Test data sent to Zapier!' : 'Qualification submitted successfully!');
      setShowVerifyDialog(false);
      onComplete?.();
    } catch (error: any) {
      console.error('Error submitting qualification:', error);
      if (error?.message?.includes('No active webhooks') && testMode) {
        toast.error('No active webhooks found. Please configure one in Settings > Zapier.');
      }
    }
  };

  // Expose submit method to parent
  if (onSubmitRef) {
    onSubmitRef(handleVerifyAndSubmit);
  }

  // Get all available sections from the full config (for toggle list)
  // This hook must be called before any early returns
  const allSections = useMemo(() => {
    if (!config || !config.sections) return [];
    return config.sections.filter(s => s.enabled);
  }, [config]);
  
  // Update visible sections when selectedSectionIds changes
  // This hook must be called before any early returns
  useEffect(() => {
    if (selectedSectionIds && selectedSectionIds.length > 0) {
      setVisibleSections(new Set(selectedSectionIds));
    } else if (allSections.length > 0) {
      // If no selectedSectionIds, show all enabled sections
      setVisibleSections(new Set(allSections.map(s => s.id)));
    }
  }, [selectedSectionIds, allSections]);

  // Early return after all hooks have been called
  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get enabled sections from filtered config
  const enabledSections = getEnabledSections(filteredConfig);

  // Toggle section visibility
  const toggleSection = (sectionId: string) => {
    setVisibleSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Show empty state if no questions configured for this script
  if (enabledSections.length === 0 || enabledSections.every(s => s.questions.length === 0)) {
    return (
      <Card className="p-6 sm:p-8 text-center">
        <p className="text-muted-foreground">
          No qualification questions configured for this script.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Configure questions in Settings → {groupType === "outbound" ? "Outbound" : "Inbound"} Scripts → Qualification tab.
        </p>
      </Card>
    );
  }

  // Filter sections to only show visible ones
  const sectionsToDisplay = enabledSections.filter(section => visibleSections.has(section.id));

  return (
    <Form {...form}>
      <form className="space-y-6 sm:space-y-8 md:space-y-10">
        {/* Section Toggle Controls (only show in testMode with selectedSectionIds) */}
        {testMode && selectedSectionIds && selectedSectionIds.length > 0 && allSections.length > 0 && (
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Display Sections</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Toggle sections to show or hide in the questionnaire form
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allSections
                  .filter(section => selectedSectionIds.includes(section.id))
                  .map(section => {
                    const isVisible = visibleSections.has(section.id);
                    const questionCount = section.questions.filter(q => q.enabled).length;
                    return (
                      <div key={section.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`section-toggle-${section.id}`}
                          checked={isVisible}
                          onCheckedChange={() => toggleSection(section.id)}
                        />
                        <Label
                          htmlFor={`section-toggle-${section.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          <div className="flex items-center justify-between">
                            <span>{section.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({questionCount} {questionCount === 1 ? 'question' : 'questions'})
                            </span>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4 sm:p-6 md:p-8 lg:p-10">
          {sectionsToDisplay.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sections are currently visible.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Use the toggle controls above to show sections.
              </p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8 md:space-y-10">
              {sectionsToDisplay.map(section => (
                <QualificationSection
                  key={section.id}
                  section={section}
                  form={form}
                />
              ))}
            </div>
          )}
        </Card>

        {testMode && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleVerifyAndSubmit} className="gap-2">
              Preview & Test Send
            </Button>
          </div>
        )}
      </form>

      <VerifyDialog
        open={showVerifyDialog}
        onOpenChange={setShowVerifyDialog}
        onConfirm={handleConfirmSubmit}
        formData={formData}
        config={filteredConfig}
        testMode={testMode}
        isSubmitting={zapierLoading}
      />
    </Form>
  );
};
