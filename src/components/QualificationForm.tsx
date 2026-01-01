import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useScriptQualificationConfig } from "@/hooks/useScriptQualificationConfig";
import { useZapier } from "@/hooks/useZapier";
import { useVICI } from "@/contexts/VICIContext";
import { useGroup } from "@/contexts/GroupContext";
import { Card } from "@/components/ui/card";
import { getAppSetting, setAppSetting, deleteAppSetting } from "@/lib/migration";
import { QualificationSection, VerifyDialog } from "./qualification";
import { getEnabledSections, QualificationQuestion } from "@/config/qualificationConfig";

interface QualificationFormProps {
  onComplete?: () => void;
  onSubmitRef?: (submitFn: () => void) => void;
  testMode?: boolean;
}

export const QualificationForm = ({ onComplete, onSubmitRef, testMode = false }: QualificationFormProps) => {
  const { config, isLoading: configLoading } = useScriptQualificationConfig();
  const { sendToAllActiveWebhooks, loading: zapierLoading } = useZapier();
  const { leadData } = useVICI();
  const { groupType } = useGroup();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);

  // Get all enabled questions across all sections
  const getAllEnabledQuestions = useCallback((): QualificationQuestion[] => {
    return config.sections
      .filter(s => s.enabled)
      .flatMap(s => s.questions.filter(q => q.enabled));
  }, [config]);

  // Build draft key based on listId and groupType
  const getDraftKey = useCallback(() => {
    const listId = leadData?.list_id && leadData.list_id !== '--A--list_id--B--'
      ? leadData.list_id
      : 'default';
    return `qualification_form_draft_${listId}_${groupType}`;
  }, [leadData?.list_id, groupType]);

  // Build dynamic schema from questions
  const buildSchema = useCallback(() => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    const questions = getAllEnabledQuestions();

    questions.forEach((question) => {
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
  }, [getAllEnabledQuestions]);

  const schema = buildSchema();
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: getAllEnabledQuestions().reduce((acc, question) => {
      acc[question.id] = '';
      return acc;
    }, {} as Record<string, any>),
  });

  // Auto-save to API
  const saveDraft = useCallback(async (data: Record<string, any>) => {
    const draftKey = getDraftKey();
    const draftData = JSON.stringify(data);

    try {
      await setAppSetting(draftKey, draftData, 'json', `Qualification form draft`);
    } catch (error) {
      console.error('Error saving draft:', error);
    }

    try {
      localStorage.setItem(draftKey, draftData);
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }
  }, [getDraftKey]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draftKey = getDraftKey();

      try {
        const apiDraft = await getAppSetting(draftKey);
        if (apiDraft) {
          const draft = JSON.parse(apiDraft);
          if (Object.keys(draft).length > 0) {
            form.reset(draft);
            toast.info('Draft restored');
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
            form.reset(draft);
            toast.info('Draft restored');
          }
        }
      } catch (error) {
        console.error('Error loading draft from localStorage:', error);
      }
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

  // Update form defaults when config changes
  useEffect(() => {
    const questions = getAllEnabledQuestions();
    const defaults = questions.reduce((acc, question) => {
      if (testMode && question.isRequired) {
        acc[question.id] = getTestValue(question);
      } else {
        acc[question.id] = '';
      }
      return acc;
    }, {} as Record<string, any>);

    form.reset(defaults);
  }, [config, testMode, getAllEnabledQuestions]);

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
    const questions = getAllEnabledQuestions();

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

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get enabled sections
  const enabledSections = getEnabledSections(config);

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

  return (
    <Form {...form}>
      <form className="space-y-6 sm:space-y-8 md:space-y-10">
        <Card className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="space-y-6 sm:space-y-8 md:space-y-10">
            {enabledSections.map(section => (
              <QualificationSection
                key={section.id}
                section={section}
                form={form}
              />
            ))}
          </div>
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
        config={config}
        testMode={testMode}
        isSubmitting={zapierLoading}
      />
    </Form>
  );
};
