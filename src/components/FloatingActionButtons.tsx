import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Check, AlertCircle, HelpCircle } from "lucide-react";

type ScriptStep = "greeting" | "qualification" | "objectionHandling" | "closingNotInterested" | "closingSuccess";

interface FloatingActionButtonsProps {
  currentStep: ScriptStep;
  onStepChange: (step: ScriptStep) => void;
  className?: string;
  onQualificationSubmit?: () => void;
}

const stepButtons: Record<ScriptStep, { label: string; action: ScriptStep; variant: "default" | "destructive" | "outline" }[]> = {
  greeting: [
    { label: "Not Interested", action: "objectionHandling", variant: "destructive" },
    { label: "Qualify", action: "qualification", variant: "default" },
  ],
  qualification: [
    { label: "Back", action: "greeting", variant: "outline" },
    { label: "Submit", action: "qualification", variant: "default" },
  ],
  objectionHandling: [
    { label: "Still Not Interested", action: "closingNotInterested", variant: "destructive" },
    { label: "Qualify", action: "qualification", variant: "default" },
  ],
  closingNotInterested: [
    { label: "Restart Script", action: "greeting", variant: "outline" },
  ],
  closingSuccess: [
    { label: "Complete Call", action: "closingSuccess", variant: "default" },
    { label: "Restart Script", action: "greeting", variant: "outline" },
  ],
};

export const FloatingActionButtons = ({ 
  currentStep, 
  onStepChange, 
  className,
  onQualificationSubmit 
}: FloatingActionButtonsProps) => {
  const buttons = stepButtons[currentStep] || [];

  if (buttons.length === 0) return null;

  const handleButtonClick = (button: typeof buttons[0]) => {
    // Special handling for qualification submit button
    if (currentStep === "qualification" && button.label === "Submit" && onQualificationSubmit) {
      onQualificationSubmit();
      return;
    }
    onStepChange(button.action);
  };

  return (
    <div
      className={cn(
        "fixed bottom-2 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-2 p-2 bg-card border border-border rounded-full shadow-header",
        "animate-fade-in",
        className
      )}
    >
      {buttons.map((button, index) => (
        <Button
          key={`${button.action}-${button.label}`}
          variant={button.variant}
          size="sm"
          onClick={() => handleButtonClick(button)}
          className={cn(
            "gap-1 font-medium min-w-[90px] sm:min-w-[120px] text-xs h-9",
            "transition-all duration-200 hover:scale-105"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {button.variant === "destructive" && <X className="h-3 w-3 sm:h-4 sm:w-4" />}
          {button.variant === "default" && <Check className="h-3 w-3 sm:h-4 sm:w-4" />}
          {button.variant === "outline" && <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />}
          {button.label}
        </Button>
      ))}
    </div>
  );
};
