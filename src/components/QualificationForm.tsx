import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useQualificationFields } from "@/hooks/useQualificationFields";
import { useZapier } from "@/hooks/useZapier";
import { useVICI } from "@/contexts/VICIContext";
import { useGroup } from "@/contexts/GroupContext";
import { Card } from "@/components/ui/card";
import { mysqlApi } from "@/lib/mysqlApi";
import { getAppSetting, setAppSetting, deleteAppSetting } from "@/lib/migration";

interface QualificationFormProps {
  onComplete?: () => void;
  onSubmitRef?: (submitFn: () => void) => void;
  testMode?: boolean;
}

const sectionNames: Record<string, string> = {
  personal: "Personal Information",
  property: "Property Information",
  loan: "Current Loan Information",
  financial: "Financial Information",
};

interface SectionScript {
  title: string;
  content: string;
  enabled?: boolean[]; // Array of enabled states for each question
}

const DEFAULT_SCRIPTS: Record<string, SectionScript> = {
  personal: {
    title: "Personal Information",
    content: "(No content - fields auto-populate from VICI)"
  },
  property: {
    title: "Property Information",
    content: `Type of property (single family, condo, etc.)

Is this your Primary residence?
is this a second home or its your investment proerty that we are talking about?

Are you you looking for additional cash-out or your just looking for the lowest rate & terms?

What is your property value? what have you seen online? or have you seen any current sales in your neighbourhood?`
  },
  loan: {
    title: "Current Loan Information",
    content: `Current first mortgage balance & payment

Current second mortgage balance & payment (if applicable) (Please taker note in your end if they have and inform he Loan Officers)

What is your interest rate for this mortgage( Applicable in both First & Second Mortgage)`
  },
  financial: {
    title: "Financial Information",
    content: `What is yor annual gross income?

Approximate credit score?

Total credit obligations (credit cards, personal loans, car loans, medical debts etc.)`
  }
};

export const QualificationForm = ({ onComplete, onSubmitRef, testMode = false }: QualificationFormProps) => {
  const { fields, groupedFields, loading } = useQualificationFields();
  const { sendToAllActiveWebhooks, loading: zapierLoading } = useZapier();
  const { leadData } = useVICI();
  const { groupType } = useGroup();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);
  const [sectionScripts, setSectionScripts] = useState<Record<string, SectionScript>>(DEFAULT_SCRIPTS);
  
  // Build draft key based on listId and groupType
  const getDraftKey = useCallback(() => {
    const listId = leadData?.list_id && leadData.list_id !== '--A--list_id--B--' 
      ? leadData.list_id 
      : 'default';
    return `qualification_form_draft_${listId}_${groupType}`;
  }, [leadData?.list_id, groupType]);

  // Fetch qualification scripts from database (dynamic based on groupType)
  useEffect(() => {
    const fetchScripts = async () => {
      try {
        // Determine step_name based on groupType
        const stepName = groupType === "outbound" ? "outbound_qualification" : "qualification";
        
        const data = await mysqlApi.findOneByField<{
          step_name: string;
          content: string;
        }>(
          "homebound_script",
          "step_name",
          stepName
        );

        if (data && data.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (parsed && typeof parsed === 'object' && 'personal' in parsed) {
              // Filter out test data and invalid content
              const testDataPatterns = ['mysql', 'test', 'sucess', 'success test', '--A--', 'placeholder'];
              const isValidContent = (content: string): boolean => {
                if (!content || content.trim() === "") return false;
                const contentLower = content.toLowerCase().trim();
                // Check if content is just test data
                return !testDataPatterns.some(pattern => contentLower.includes(pattern));
              };
              
              // Clean and validate each section
              const cleanedScripts: Record<string, SectionScript> = {};
              let hasValidContent = false;
              
              for (const [key, section] of Object.entries(parsed)) {
                if (section && typeof section === 'object' && 'content' in section) {
                  const sectionContent = String(section.content || '').trim();
                  if (isValidContent(sectionContent)) {
                    const questions = parseQuestions(sectionContent);
                    // Initialize enabled array - default all to true if not set
                    const enabled = Array.isArray(section.enabled) 
                      ? section.enabled 
                      : questions.map(() => true);
                    
                    cleanedScripts[key] = {
                      title: String(section.title || DEFAULT_SCRIPTS[key as keyof typeof DEFAULT_SCRIPTS]?.title || ''),
                      content: sectionContent,
                      enabled: enabled.slice(0, questions.length) // Ensure array length matches questions
                    };
                    hasValidContent = true;
                  } else {
                    // Use default for invalid/test content
                    const defaultContent = DEFAULT_SCRIPTS[key as keyof typeof DEFAULT_SCRIPTS]?.content || '';
                    const defaultQuestions = parseQuestions(defaultContent);
                    cleanedScripts[key] = {
                      ...DEFAULT_SCRIPTS[key as keyof typeof DEFAULT_SCRIPTS],
                      enabled: defaultQuestions.map(() => true)
                    };
                  }
                }
              }
              
              if (hasValidContent) {
                setSectionScripts(cleanedScripts);
              } else {
                // All content was invalid, use defaults
                console.warn("Qualification script content appears to be test data or invalid. Using defaults.");
                setSectionScripts(DEFAULT_SCRIPTS);
              }
            } else {
              // Invalid structure, use defaults
              console.warn("Qualification script has invalid structure. Using defaults.");
              setSectionScripts(DEFAULT_SCRIPTS);
            }
          } catch (parseError) {
            console.error("Could not parse qualification script JSON:", parseError);
            console.warn("Using default qualification scripts.");
            setSectionScripts(DEFAULT_SCRIPTS);
          }
        }
        // If no data, keep DEFAULT_SCRIPTS
      } catch (error: any) {
        console.error("Error fetching qualification scripts:", error);
      }
    };

    fetchScripts();
  }, [groupType]);

  // Build dynamic schema from fields
  const buildSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    fields.forEach((field) => {
      if (field.field_type === 'email') {
        schemaFields[field.field_name] = field.is_required
          ? z.string().trim().email('Invalid email address').min(1, `${field.field_label} is required`)
          : z.string().trim().email('Invalid email address').optional();
      } else if (field.field_type === 'number' || field.field_type === 'currency' || field.field_type === 'percentage') {
        schemaFields[field.field_name] = field.is_required
          ? z.string().trim().min(1, `${field.field_label} is required`)
          : z.string().trim().optional();
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
      // Pre-populate with VICI lead data if available
      if (field.field_name === 'customer_email' && leadData.email) {
        acc[field.field_name] = leadData.email;
      } else {
        acc[field.field_name] = '';
      }
      return acc;
    }, {} as Record<string, any>),
  });

  // Auto-save to API (with localStorage fallback)
  const saveDraft = useCallback(async (data: Record<string, any>) => {
    const draftKey = getDraftKey();
    const draftData = JSON.stringify(data);
    
    try {
      // Save to API
      await setAppSetting(
        draftKey,
        draftData,
        'json',
        `Qualification form draft for listId: ${leadData?.list_id || 'default'}, groupType: ${groupType}`
      );
    } catch (error) {
      console.error('Error saving draft to API:', error);
    }
    
    // Also save to localStorage for backward compatibility
    try {
      localStorage.setItem(draftKey, draftData);
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }
  }, [getDraftKey, leadData?.list_id, groupType]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draftKey = getDraftKey();
      
      try {
        // Try to load from API first
        const apiDraft = await getAppSetting(draftKey);
        if (apiDraft) {
          try {
            const draft = JSON.parse(apiDraft);
            if (Object.keys(draft).length > 0) {
              form.reset(draft);
              toast.info('Draft restored');
              return;
            }
          } catch (parseError) {
            console.error('Error parsing API draft:', parseError);
          }
        }
      } catch (error) {
        console.error('Error loading draft from API:', error);
      }
      
      // Fallback to localStorage
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

  // Generate default test data for test mode
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
    if (field.field_type === 'date') return '1985-01-15';
    if (field.field_type === 'phone') return '(555) 123-4567';
    if (field.field_name === 'borrower_first_name') return 'John';
    if (field.field_name === 'borrower_last_name') return 'Doe';
    if (field.field_name === 'borrower_address') return '123 Main Street';
    if (field.field_name === 'borrower_state') return 'CA';
    return '';
  };

  // Update form defaults when fields or leadData change
  useEffect(() => {
    const defaults = fields.reduce((acc, field) => {
      // In test mode, use sample data if no VICI data available
      if (testMode) {
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
        } else {
          // Use test values for required fields
          acc[field.field_name] = field.is_required ? getTestValue(field) : '';
        }
      } else {
        // Normal mode: only use VICI data
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
        } else {
          acc[field.field_name] = '';
        }
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

  // Validate email - default to noemail@itsbuzzmarketing.com if invalid/missing
  const validateEmail = (emailValue: string | null | undefined): string => {
    if (!emailValue || emailValue.trim() === '') {
      return 'noemail@itsbuzzmarketing.com';
    }
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(emailValue.trim())) {
      return 'noemail@itsbuzzmarketing.com';
    }
    
    return emailValue.trim();
  };

  // Validate and format birthdate - default to Jan 1, 1970 if invalid/missing
  const validateBirthdate = (dateValue: string | null | undefined): string => {
    if (!dateValue || dateValue.trim() === '' || dateValue === '0000-00-00') {
      return '1970-01-01';
    }
    
    // Try to parse the date
    const date = new Date(dateValue);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '1970-01-01';
    }
    
    // Check if it's a reasonable date (between 1900 and current year + 100)
    const year = date.getFullYear();
    if (year < 1900 || year > new Date().getFullYear() + 100) {
      return '1970-01-01';
    }
    
    // Return valid date in YYYY-MM-DD format
    return dateValue;
  };

  const handleConfirmSubmit = async () => {
    const data = form.getValues();
    
    // Build mapping of form field names to Zapier field names
    const fieldMapping = new Map(
      fields.map(f => [f.field_name, f.zapier_field_name || f.field_name])
    );

    // Helper to get Zapier field name with fallback
    const getZapierFieldName = (fieldName: string, fallback: string) => 
      fieldMapping.get(fieldName) || fallback;

    // Helper function to get VICI field value or default to "0"
    const getVICIFieldValue = (fieldName: string): string => {
      const value = leadData[fieldName];
      // Check if value exists and is not a placeholder
      if (value && value !== '--A----B--' && !value.startsWith('--A--')) {
        return value;
      }
      return '0';
    };

    // Prepare Zapier payload using database-configured field mappings
    const zapierPayload: Record<string, any> = {
      // Source ID
      [getZapierFieldName('source_id', 'source_id')]: leadData.source_id || 'querystring',
    };

    // Map all form fields using database-configured zapier_field_name
    fields.forEach((field) => {
      const value = data[field.field_name];
      const zapierFieldName = field.zapier_field_name || field.field_name;
      
      // Handle special cases with VICI lead data fallbacks
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
        // Clean currency values (remove $, commas)
        zapierPayload[zapierFieldName] = value.replace(/[$,]/g, '');
      } else {
        zapierPayload[zapierFieldName] = value || '';
      }
    });

    // Add specific supported fields with default value "0" if not provided
    const supportedFields = ['fico_score', 'ltv', 'credit_grade', 'mortgage_balance', 'ssn'];
    supportedFields.forEach((fieldName) => {
      zapierPayload[fieldName] = getVICIFieldValue(fieldName);
    });

    console.log('Qualification data:', zapierPayload);
    
    try {
      await sendToAllActiveWebhooks(zapierPayload);
      
      // Clear draft on successful submission
      const draftKey = getDraftKey();
      try {
        await deleteAppSetting(draftKey);
      } catch (error) {
        console.error('Error deleting draft from API:', error);
      }
      try {
        localStorage.removeItem(draftKey);
      } catch (error) {
        console.error('Error deleting draft from localStorage:', error);
      }
      
      if (testMode) {
        toast.success('Test data sent to Zapier! Check your Zap history to confirm receipt.');
      } else {
        toast.success('Qualification submitted successfully!');
      }
      setShowVerifyDialog(false);
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error submitting qualification:', error);
      
      // Provide helpful guidance for common errors
      if (error?.message?.includes('No active webhooks')) {
        if (testMode) {
          toast.error('No active webhooks found. Please go to Settings > Zapier tab to activate a webhook before testing.', {
            duration: 5000,
          });
        }
      }
      // Error toast is already shown by useZapier hook for other errors
    }
  };

  // Expose submit method to parent via callback
  if (onSubmitRef) {
    onSubmitRef(handleVerifyAndSubmit);
  }

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return '$' + parseInt(num).toLocaleString();
  };

  // Helper function to parse questions from script content
  const parseQuestions = (content: string): string[] => {
    if (!content || content.trim() === "" || content.includes("(No content")) {
      return [];
    }
    
    // Split by newlines and filter out empty lines
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('(') && !line.startsWith('['));
  };

  // Helper function to match questions to fields (fuzzy matching)
  const matchQuestionToField = (question: string, fields: any[]): any | null => {
    const questionLower = question.toLowerCase();
    
    // Try to match based on keywords
    for (const field of fields) {
      const labelLower = field.field_label.toLowerCase();
      const nameLower = field.field_name.toLowerCase();
      
      // Check for common keywords
      if (questionLower.includes('property type') || questionLower.includes('type of property')) {
        if (nameLower.includes('property_type')) return field;
      }
      if (questionLower.includes('primary residence') || questionLower.includes('occupancy') || questionLower.includes('second home') || questionLower.includes('investment property')) {
        if (nameLower.includes('occupancy')) return field;
      }
      if (questionLower.includes('cash-out') || questionLower.includes('refinance type') || questionLower.includes('lowest rate')) {
        if (nameLower.includes('refinance_type')) return field;
      }
      if (questionLower.includes('property value') || questionLower.includes('value')) {
        if (nameLower.includes('property_value')) return field;
      }
      if (questionLower.includes('mortgage balance') || questionLower.includes('balance')) {
        if (nameLower.includes('mortgage_balance')) return field;
      }
      if (questionLower.includes('interest rate') || questionLower.includes('rate')) {
        if (nameLower.includes('interest_rate')) return field;
      }
      if (questionLower.includes('annual income') || questionLower.includes('income') || questionLower.includes('gross income')) {
        if (nameLower.includes('annual_income')) return field;
      }
      if (questionLower.includes('credit score') || questionLower.includes('credit')) {
        if (nameLower.includes('credit_score')) return field;
      }
      if (questionLower.includes('debt') || questionLower.includes('obligations')) {
        if (nameLower.includes('debt')) return field;
      }
    }
    
    return null;
  };

  const renderField = (field: any, showLabel: boolean = false) => {
    // Phone number field should be disabled/read-only
    const isReadOnly = field.field_type === 'phone';
    
    if (field.field_type === 'select') {
      const options = field.field_options?.options || [];
      const shouldUseRadio = options.length <= 4 && options.length > 0; // Use radio for 4 or fewer options
      
      if (shouldUseRadio) {
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.field_name}
            render={({ field: formField }) => (
              <FormItem>
                {showLabel && (
                  <FormLabel className="text-base font-medium">
                    {field.field_label}
                    {field.is_required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                )}
                <FormControl>
                  <RadioGroup
                    onValueChange={formField.onChange}
                    value={formField.value || ""}
                    className="flex flex-col space-y-3 mt-1"
                  >
                    {options.filter((opt: any) => opt.value !== "").map((option: any) => (
                      <div key={option.value} className="flex items-center space-x-3">
                        <RadioGroupItem value={option.value} id={`${field.field_name}-${option.value}`} />
                        <Label 
                          htmlFor={`${field.field_name}-${option.value}`}
                          className="font-normal cursor-pointer text-sm leading-relaxed"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                {field.help_text && (
                  <FormDescription className="text-xs italic mt-1">
                    {field.help_text}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
      
      // Otherwise use select dropdown
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={field.field_name}
          render={({ field: formField }) => (
            <FormItem>
              {showLabel && (
                <FormLabel className="text-base font-medium">
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
              )}
              <Select onValueChange={formField.onChange} value={formField.value || ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {options.filter((opt: any) => opt.value !== "").map((option: any) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.help_text && (
                <FormDescription className="text-xs italic mt-1">
                  {field.help_text}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } else if (field.field_type === 'currency') {
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={field.field_name}
          render={({ field: formField }) => (
            <FormItem>
              {showLabel && (
                <FormLabel className="text-base font-medium">
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input
                  {...formField}
                  placeholder={field.placeholder || ''}
                  onChange={(e) => {
                    formField.onChange(formatCurrency(e.target.value));
                  }}
                  className="w-full"
                />
              </FormControl>
              {field.help_text && (
                <FormDescription className="text-xs italic mt-1">
                  {field.help_text}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } else if (field.field_type === 'percentage') {
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={field.field_name}
          render={({ field: formField }) => (
            <FormItem>
              {showLabel && (
                <FormLabel className="text-base font-medium">
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input
                  {...formField}
                  placeholder={field.placeholder || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    formField.onChange(value ? value + '%' : '');
                  }}
                  className="w-full"
                />
              </FormControl>
              {field.help_text && (
                <FormDescription className="text-xs italic mt-1">
                  {field.help_text}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    } else {
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={field.field_name}
          render={({ field: formField }) => (
            <FormItem>
              {showLabel && (
                <FormLabel className="text-base font-medium">
                  {field.field_label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input
                  type={field.field_type === 'email' ? 'email' : field.field_type === 'date' ? 'date' : 'text'}
                  placeholder={field.placeholder || ''}
                  disabled={isReadOnly}
                  className={`w-full ${isReadOnly ? 'bg-muted cursor-not-allowed' : ''}`}
                  {...formField}
                />
              </FormControl>
              {field.help_text && (
                <FormDescription className="text-xs italic mt-1">
                  {field.help_text}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Define custom field order and layout with section breaks
  const fieldOrder = [
    // Personal Information
    { name: 'borrower_first_name', fullWidth: false, section: 'personal' },
    { name: 'borrower_last_name', fullWidth: false, section: 'personal' },
    { name: 'borrower_phone', fullWidth: false, section: 'personal' },
    { name: 'customer_email', fullWidth: false, section: 'personal' },
    // Property Information
    { name: 'property_type', fullWidth: false, section: 'property' },
    { name: 'property_occupancy', fullWidth: false, section: 'property' },
    { name: 'refinance_type', fullWidth: false, section: 'property' },
    { name: 'property_value', fullWidth: false, section: 'property' },
    // Loan Information
    { name: 'current_mortgage_balance', fullWidth: false, section: 'loan' },
    { name: 'current_interest_rate', fullWidth: false, section: 'loan' },
    // Financial Information (all in same section)
    { name: 'annual_income', fullWidth: true, section: 'financial' },
    { name: 'credit_score_range', fullWidth: false, section: 'financial' },
    { name: 'monthly_debt_payments', fullWidth: false, section: 'financial' },
  ];

  // Create a map of fields by name for easy lookup
  const fieldsByName = fields.reduce((acc, field) => {
    acc[field.field_name] = field;
    return acc;
  }, {} as Record<string, any>);

  // Render fields in custom order with sections
  const orderedFields = fieldOrder
    .map(order => fieldsByName[order.name] ? { ...fieldsByName[order.name], fullWidth: order.fullWidth, customSection: order.section } : null)
    .filter(Boolean);

  // Get any remaining fields not in the custom order
  const remainingFields = fields.filter(
    field => !fieldOrder.some(order => order.name === field.field_name)
  );

  // Group ordered fields by section
  const groupedOrderedFields = orderedFields.reduce((acc: any, field: any) => {
    const section = field.customSection || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {});

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Card className="p-6 md:p-8">
          <div className="space-y-8">
            {/* Render each section with questions */}
            {Object.entries(groupedOrderedFields)
              .filter(([sectionKey]) => sectionKey !== 'personal') // Hide personal information section
              .map(([sectionKey, sectionFields]: [string, any[]]) => {
              const sectionScript = sectionScripts[sectionKey];
              if (!sectionScript || !sectionFields.length) return null;
              
              const allQuestions = parseQuestions(sectionScript.content);
              // Filter out disabled questions based on enabled array
              const enabledStates = sectionScript.enabled || allQuestions.map(() => true);
              const questions = allQuestions.filter((_, index) => enabledStates[index] !== false);
              
              return (
                <div key={sectionKey} className="space-y-6">
                  {/* Section Header */}
                  <div className="border-b border-border pb-4">
                    <h3 className="text-xl font-semibold text-foreground">
                      {sectionScript.title}
                    </h3>
                  </div>
                  
                  {/* Render questions with fields */}
                  {questions.length > 0 ? (
                    <div className="space-y-6 pt-2">
                      {questions.map((question, questionIndex) => {
                        // Try to match question to a field
                        const matchedField = matchQuestionToField(question, sectionFields);
                        
                        if (matchedField) {
                          return (
                            <div key={`${sectionKey}-q-${questionIndex}`} className="space-y-3">
                              {/* Question */}
                              <div className="flex items-start gap-3">
                                <span className="text-base font-medium text-foreground min-w-[2rem] pt-0.5">
                                  {questionIndex + 1}.
                                </span>
                                <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                                  {question}
                                  {matchedField.is_required && (
                                    <span className="text-destructive ml-1">*</span>
                                  )}
                                </p>
                              </div>
                              
                              {/* Input Field */}
                              <div className="ml-11">
                                {renderField(matchedField, false)}
                                {matchedField.help_text && (
                                  <p className="text-xs text-muted-foreground mt-1.5 italic">
                                    {matchedField.help_text}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }
                        
                        // If no match, just show the question
                        return (
                          <div key={`${sectionKey}-q-${questionIndex}`} className="space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="text-base font-medium text-foreground min-w-[2rem] pt-0.5">
                                {questionIndex + 1}.
                              </span>
                              <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                                {question}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Render any unmatched fields for this section */}
                      {sectionFields
                        .filter(field => !questions.some(q => matchQuestionToField(q, [field])))
                        .map((field) => (
                          <div key={field.id} className="space-y-3">
                            <div className="flex items-start gap-3">
                              <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                                {field.field_label}
                                {field.is_required && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </p>
                            </div>
                            <div className="ml-11">
                              {renderField(field, false)}
                              {field.help_text && (
                                <p className="text-xs text-muted-foreground mt-1.5 italic">
                                  {field.help_text}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    // If no questions parsed, show fields in traditional format
                    <div className="space-y-5">
                      {sectionFields.map((field) => (
                        <div key={field.id} className="space-y-2.5">
                          <FormLabel className="text-base font-medium">
                            {field.field_label}
                            {field.is_required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </FormLabel>
                          <div className="max-w-2xl">
                            {renderField(field, false)}
                          </div>
                          {field.help_text && (
                            <p className="text-xs text-muted-foreground italic mt-1.5">
                              {field.help_text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Remaining fields not in any section */}
            {remainingFields.length > 0 && (
              <div className="border-t pt-6 space-y-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Additional Information
                </h3>
                {remainingFields.map((field) => (
                  <div key={field.id} className="space-y-2.5">
                    <FormLabel className="text-base font-medium">
                      {field.field_label}
                      {field.is_required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </FormLabel>
                    <div className="max-w-2xl">
                      {renderField(field, false)}
                    </div>
                    {field.help_text && (
                      <p className="text-xs text-muted-foreground italic mt-1.5">
                        {field.help_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
        
        {testMode && (
          <div className="flex justify-end">
            <Button 
              type="button" 
              onClick={handleVerifyAndSubmit}
              className="gap-2"
            >
              Preview & Test Send
            </Button>
          </div>
        )}
      </form>

      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {testMode ? 'Test Data Summary' : 'Verify Information'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-6 mt-4">
                {testMode && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      <strong>Test Mode:</strong> This will send test data to all active Zapier webhooks. 
                      Check your Zap history to verify the data was received correctly.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Property Information */}
                {groupedOrderedFields.property && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Property Information
                    </h4>
                    <div className="space-y-2">
                      {groupedOrderedFields.property.map((field: any) => (
                        <div key={field.id} className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {field.field_label}:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formData?.[field.field_name] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loan Information */}
                {groupedOrderedFields.loan && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Current Loan Information
                    </h4>
                    <div className="space-y-2">
                      {groupedOrderedFields.loan.map((field: any) => (
                        <div key={field.id} className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {field.field_label}:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formData?.[field.field_name] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Information */}
                {groupedOrderedFields.financial && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Financial Information
                    </h4>
                    <div className="space-y-2">
                      {groupedOrderedFields.financial.map((field: any) => (
                        <div key={field.id} className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {field.field_label}:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formData?.[field.field_name] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining fields */}
                {remainingFields.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Additional Information
                    </h4>
                    <div className="space-y-2">
                      {remainingFields.map((field) => (
                        <div key={field.id} className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {field.field_label}:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formData?.[field.field_name] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Edit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={zapierLoading}>
              {zapierLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {testMode ? 'Testing...' : 'Submitting...'}
                </>
              ) : (
                testMode ? 'Test Send to Zapier' : 'Confirm & Submit'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
};
