import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { QualificationConfig, getEnabledSections } from "@/config/qualificationConfig";
import { FormField as FormFieldType } from "@/hooks/useQualificationFields";

interface VerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  formData: Record<string, any> | null;
  config: QualificationConfig;
  fields: FormFieldType[];
  testMode?: boolean;
  isSubmitting?: boolean;
}

export const VerifyDialog = ({
  open,
  onOpenChange,
  onConfirm,
  formData,
  config,
  fields,
  testMode = false,
  isSubmitting = false,
}: VerifyDialogProps) => {
  const enabledSections = getEnabledSections(config);

  // Create a map of field names to field labels
  const fieldLabels = fields.reduce((acc, field) => {
    acc[field.field_name] = field.field_label;
    return acc;
  }, {} as Record<string, string>);

  // Group form data by section based on field mappings
  const groupedData: Record<string, { label: string; value: string }[]> = {};

  enabledSections.forEach(section => {
    groupedData[section.id] = [];
    section.questions.forEach(question => {
      if (question.fieldName && formData?.[question.fieldName]) {
        groupedData[section.id].push({
          label: fieldLabels[question.fieldName] || question.fieldName,
          value: formData[question.fieldName],
        });
      }
    });
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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

              {enabledSections.map(section => {
                const sectionData = groupedData[section.id];
                if (!sectionData || sectionData.length === 0) return null;

                return (
                  <div key={section.id}>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {section.title}
                    </h4>
                    <div className="space-y-2">
                      {sectionData.map((item, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {item.label}:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.value || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Edit</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
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
  );
};
