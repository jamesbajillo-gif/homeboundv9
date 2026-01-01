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

interface VerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  formData: Record<string, any> | null;
  config: QualificationConfig;
  testMode?: boolean;
  isSubmitting?: boolean;
}

export const VerifyDialog = ({
  open,
  onOpenChange,
  onConfirm,
  formData,
  config,
  testMode = false,
  isSubmitting = false,
}: VerifyDialogProps) => {
  const enabledSections = getEnabledSections(config);

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
                  </AlertDescription>
                </Alert>
              )}

              {enabledSections.map(section => {
                const sectionQuestions = section.questions.filter(q => q.enabled && formData?.[q.id]);
                if (sectionQuestions.length === 0) return null;

                return (
                  <div key={section.id}>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {section.title}
                    </h4>
                    <div className="space-y-2">
                      {sectionQuestions.map((question) => (
                        <div key={question.id} className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {question.question.substring(0, 40)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formData?.[question.id] || '-'}
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
