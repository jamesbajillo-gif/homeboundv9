import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useQualificationFields } from "@/hooks/useQualificationFields";
import { useQualificationConfig } from "@/hooks/useQualificationConfig";
import { useZapier } from "@/hooks/useZapier";
import { useVICI } from "@/contexts/VICIContext";
import { useGroup } from "@/contexts/GroupContext";
import { Card } from "@/components/ui/card";
import { getAppSetting, setAppSetting, deleteAppSetting } from "@/lib/migration";
import { QualificationSection, VerifyDialog } from "./qualification";
import { getEnabledSections } from "@/config/qualificationConfig";

interface QualificationFormProps {
  onComplete?: () => void;
  onSubmitRef?: (submitFn: () => void) => void;
  testMode?: boolean;
}

// Field order mapping for sections
const FIELD_SECTION_MAP: Record<string, string[]> = {
  personal: ['borrower_first_name', 'borrower_last_name', 'borrower_phone', 'customer_email'],
  property: ['property_type', 'property_occupancy', 'refinance_type', 'property_value'],
  loan: ['current_mortgage_balance', 'current_interest_rate'],
  financial: ['annual_income', 'credit_score_range', 'monthly_debt_payments'],
};

export const QualificationForm = ({ onComplete, onSubmitRef, testMode = false }: QualificationFormProps) => {
  const { fields, loading: fieldsLoading } = useQualificationFields();
  const { config, isLoading: configLoading } = useQualificationConfig();
  const { sendToAllActiveWebhooks, loading: zapierLoading } = useZapier();
  const { leadData } = useVICI();
  const { groupType } = useGroup();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);

  // Build draft key based on listId and groupType
  const getDraftKey = useCallback(() => {
    const listId = leadData?.list_id && leadData.list_id !== '--A--list_id--B--'
      ? leadData.list_id
      : 'default';
    return `qualification_form_draft_${listId}_${groupType}`;
  }, [leadData?.list_id, groupType]);

  // Build dynamic schema from fields
  const buildSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
      if (field.field_type === 'email') {
        schemaFields[field.field_name] = field.is_required
          ? z.string().trim().email('Invalid email address').min(1, `${field.field_label} is required`)
          : z.string().trim().email('Invalid email address').optional();
      } else if (field.field_type === 'select') {
        schemaFields[field.field_name] = field.is_required
          ? z.string().min(1, `${field.field_label} is required`)
          : z.string().optional();
      } else {
        schemaFields[field.field_name] = field.is_required
          ? z.string().trim().min(1, `${field.field_label} is required`)
          : z.string().trim().optional();
      }
    });

    return z.object(schemaFields);
  };

  const schema = buildSchema();
  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.field_name] = '';
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

  // Get test values for fields
  const getTestValue = (field: any) => {
    if (field.field_type === 'email') return 'test.user@example.com';
    if (field.field_type === 'currency') {
      if (field.field_name === 'property_value') return '$500,000';
      if (field.field_name === 'current_mortgage_balance') return '$350,000';
      if (field.field_name === 'annual_income') return '$120,000';
      if (field.field_name === 'monthly_debt_payments') return '$2,500';
      return '$100,000';
    }
    if (field.field_type === 'percentage') return '6.5%';
    if (field.field_type === 'select') {
      const options = field.field_options?.options || [];
      const validOptions = options.filter((opt: any) => opt.value !== "");
      return validOptions.length > 0 ? validOptions[0].value : '';
    }
    if (field.field_name === 'borrower_first_name') return 'John';
    if (field.field_name === 'borrower_last_name') return 'Doe';
    return '';
  };

  // Update form defaults when fields or leadData change
  useEffect(() => {
    const defaults = fields.reduce((acc, field) => {
      // Map VICI data to form fields
      if (field.field_name === 'customer_email' && leadData.email) {
        acc[field.field_name] = leadData.email;
      } else if (field.field_name === 'borrower_first_name' && leadData.first_name) {
        acc[field.field_name] = leadData.first_name;
      } else if (field.field_name === 'borrower_last_name' && leadData.last_name) {
        acc[field.field_name] = leadData.last_name;
      } else if (field.field_name === 'borrower_phone' && leadData.phone_number) {
        acc[field.field_name] = leadData.phone_number;
      } else if (field.field_name === 'borrower_date_of_birth' && leadData.date_of_birth) {
        acc[field.field_name] = leadData.date_of_birth;
      } else if (field.field_name === 'borrower_address' && leadData.address1) {
        acc[field.field_name] = leadData.address1;
      } else if (field.field_name === 'borrower_state' && leadData.state) {
        acc[field.field_name] = leadData.state;
      } else if (testMode && field.is_required) {
        acc[field.field_name] = getTestValue(field);
      } else {
        acc[field.field_name] = '';
      }
      return acc;
    }, {} as Record<string, any>);

    form.reset(defaults);
  }, [fields, leadData, testMode]);

  const handleVerifyAndSubmit = () => {
    form.trigger().then((isValid) => {
      if (isValid) {
        const data = form.getValues();
        setFormData(data);
        setShowVerifyDialog(true);
      }
    });
  };

  const validateEmail = (emailValue: string | null | undefined): string => {
    if (!emailValue || emailValue.trim() === '') {
      return 'noemail@itsbuzzmarketing.com';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      return 'noemail@itsbuzzmarketing.com';
    }
    return emailValue.trim();
  };

  const validateBirthdate = (dateValue: string | null | undefined): string => {
    if (!dateValue || dateValue.trim() === '' || dateValue === '0000-00-00') {
      return '1970-01-01';
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return '1970-01-01';
    }
    return dateValue;
  };

  const handleConfirmSubmit = async () => {
    const data = form.getValues();

    // Build Zapier payload
    const zapierPayload: Record<string, any> = {
      source_id: leadData.source_id || 'querystring',
    };

    fields.forEach((field) => {
      const value = data[field.field_name];
      const zapierFieldName = field.zapier_field_name || field.field_name;

      if (field.field_name === 'borrower_first_name') {
        zapierPayload[zapierFieldName] = leadData.first_name || value || 'Not Provided';
      } else if (field.field_name === 'borrower_last_name') {
        zapierPayload[zapierFieldName] = leadData.last_name || value || 'Not Provided';
      } else if (field.field_name === 'customer_email') {
        zapierPayload[zapierFieldName] = validateEmail(leadData.email || value);
      } else if (field.field_name === 'borrower_phone') {
        zapierPayload[zapierFieldName] = leadData.phone_number || value || '';
      } else if (field.field_name === 'borrower_date_of_birth') {
        zapierPayload[zapierFieldName] = validateBirthdate(leadData.date_of_birth || value);
      } else if (field.field_name === 'borrower_address') {
        zapierPayload[zapierFieldName] = leadData.address1 || value || '';
      } else if (field.field_name === 'borrower_city') {
        zapierPayload[zapierFieldName] = leadData.city || value || '';
      } else if (field.field_name === 'borrower_state') {
        zapierPayload[zapierFieldName] = leadData.state || value || '';
      } else if (field.field_name === 'borrower_postal_code') {
        zapierPayload[zapierFieldName] = leadData.postal_code || value || '';
      } else if (field.field_type === 'currency' && value) {
        zapierPayload[zapierFieldName] = value.replace(/[$,]/g, '');
      } else {
        zapierPayload[zapierFieldName] = value || '';
      }
    });

    // Add VICI-specific fields
    const viciFields = ['fico_score', 'ltv', 'credit_grade', 'mortgage_balance', 'ssn'];
    viciFields.forEach((fieldName) => {
      const value = leadData[fieldName];
      zapierPayload[fieldName] = value && !value.startsWith('--A--') ? value : '0';
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

  if (fieldsLoading || configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get enabled sections and their fields
  const enabledSections = getEnabledSections(config);

  // Group fields by section
  const getFieldsForSection = (sectionId: string) => {
    const fieldNames = FIELD_SECTION_MAP[sectionId] || [];
    return fields.filter(f => fieldNames.includes(f.field_name));
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Card className="p-6 md:p-8">
          <div className="space-y-8">
            {enabledSections
              .filter(section => section.id !== 'personal') // Hide personal section - auto-populates from VICI
              .map(section => (
                <QualificationSection
                  key={section.id}
                  section={section}
                  fields={getFieldsForSection(section.id)}
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
        fields={fields}
        testMode={testMode}
        isSubmitting={zapierLoading}
      />
    </Form>
  );
};
