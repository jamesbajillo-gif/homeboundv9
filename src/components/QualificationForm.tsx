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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card } from "@/components/ui/card";

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

export const QualificationForm = ({ onComplete, onSubmitRef, testMode = false }: QualificationFormProps) => {
  const { fields, groupedFields, loading } = useQualificationFields();
  const { sendToAllActiveWebhooks, loading: zapierLoading } = useZapier();
  const { leadData } = useVICI();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);
  
  const DRAFT_KEY = 'qualification_form_draft';

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

  // Auto-save to localStorage
  const saveDraft = useCallback((data: Record<string, any>) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [DRAFT_KEY]);

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only restore if we have actual data
        if (Object.keys(draft).length > 0) {
          form.reset(draft);
          toast.info('Draft restored');
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [DRAFT_KEY]);

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

    console.log('Qualification data:', zapierPayload);
    
    try {
      await sendToAllActiveWebhooks(zapierPayload);
      
      // Clear draft on successful submission
      localStorage.removeItem(DRAFT_KEY);
      
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

  const renderField = (field: any) => {
    // Phone number field should be disabled/read-only
    const isReadOnly = field.field_type === 'phone';
    
    if (field.field_type === 'select') {
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={field.field_name}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.field_label}
                {field.is_required && <span className="text-destructive">*</span>}
              </FormLabel>
              <Select onValueChange={formField.onChange} value={formField.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {field.field_options?.options?.filter((option: any) => option.value !== "").map((option: any) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.help_text && (
                <FormDescription className="text-xs italic">
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
              <FormLabel>
                {field.field_label}
                {field.is_required && <span className="text-destructive">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  {...formField}
                  placeholder={field.placeholder || ''}
                  onChange={(e) => {
                    formField.onChange(formatCurrency(e.target.value));
                  }}
                />
              </FormControl>
              {field.help_text && (
                <FormDescription className="text-xs italic">
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
              <FormLabel>
                {field.field_label}
                {field.is_required && <span className="text-destructive">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  {...formField}
                  placeholder={field.placeholder || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    formField.onChange(value ? value + '%' : '');
                  }}
                />
              </FormControl>
              {field.help_text && (
                <FormDescription className="text-xs italic">
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
              <FormLabel>
                {field.field_label}
                {field.is_required && <span className="text-destructive">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  type={field.field_type === 'email' ? 'email' : field.field_type === 'date' ? 'date' : 'text'}
                  placeholder={field.placeholder || ''}
                  disabled={isReadOnly}
                  className={isReadOnly ? 'bg-muted cursor-not-allowed' : ''}
                  {...formField}
                />
              </FormControl>
              {field.help_text && (
                <FormDescription className="text-xs italic">
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
        <Card className="p-6">
          <div className="space-y-6">
            {/* Personal Information */}
            {groupedOrderedFields.personal && (
              <div className="grid grid-cols-2 gap-4">
                {groupedOrderedFields.personal.map((field: any) => (
                  <div key={field.id} className={field.fullWidth ? "col-span-2" : ""}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            )}
            
            {/* Property Information */}
            {groupedOrderedFields.property && (
              <>
                <div className="border-t pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {groupedOrderedFields.property.map((field: any) => (
                      <div key={field.id} className={field.fullWidth ? "col-span-2" : ""}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Loan Information */}
            {groupedOrderedFields.loan && (
              <>
                <div className="border-t pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {groupedOrderedFields.loan.map((field: any) => (
                      <div key={field.id} className={field.fullWidth ? "col-span-2" : ""}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {/* Financial Information */}
            {groupedOrderedFields.financial && (
              <>
                <div className="border-t pt-6">
                  <div className="space-y-4">
                    {groupedOrderedFields.financial.map((field: any, index: number) => (
                      field.fullWidth ? (
                        <div key={field.id}>
                          {renderField(field)}
                        </div>
                      ) : null
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                      {groupedOrderedFields.financial
                        .filter((field: any) => !field.fullWidth)
                        .map((field: any) => (
                          <div key={field.id}>
                            {renderField(field)}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Remaining fields */}
            {remainingFields.length > 0 && (
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {remainingFields.map((field) => (
                    <div key={field.id}>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
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
                
                {/* Personal Information */}
                {groupedOrderedFields.personal && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Personal Information
                    </h4>
                    <div className="space-y-2">
                      {groupedOrderedFields.personal.map((field: any) => (
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
