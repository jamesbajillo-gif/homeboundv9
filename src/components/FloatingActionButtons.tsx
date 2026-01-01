import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Phone, ClipboardCheck, MessageSquare, XCircle, CheckCircle, Send } from "lucide-react";

type ScriptStep = "greeting" | "qualification" | "objectionHandling" | "closingNotInterested" | "closingSuccess";

interface FloatingActionButtonsProps {
  currentStep: ScriptStep;
  onStepChange: (step: ScriptStep) => void;
  className?: string;
  onQualificationSubmit?: () => void;
}

const scriptTabs: { id: ScriptStep; label: string; shortLabel: string; icon: typeof Phone }[] = [
  { id: "greeting", label: "Greeting", shortLabel: "Greet", icon: Phone },
  { id: "qualification", label: "Qualification", shortLabel: "Qualify", icon: ClipboardCheck },
  { id: "objectionHandling", label: "Objections", shortLabel: "Object", icon: MessageSquare },
  { id: "closingNotInterested", label: "Not Interested", shortLabel: "No", icon: XCircle },
  { id: "closingSuccess", label: "Success", shortLabel: "Yes", icon: CheckCircle },
];

export const FloatingActionButtons = ({ 
  currentStep, 
  onStepChange, 
  className,
  onQualificationSubmit 
}: FloatingActionButtonsProps) => {
  const isQualificationStep = currentStep === "qualification";

  return (
    <div
      className={cn(
        "fixed bottom-2 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-card border border-border rounded-full shadow-header",
        "animate-fade-in",
        className
      )}
    >
      {scriptTabs.map((tab) => {
        const isActive = currentStep === tab.id;
        const Icon = tab.icon;
        
        return (
          <Button
            key={tab.id}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onStepChange(tab.id)}
            className={cn(
              "gap-1 font-medium text-xs h-8 sm:h-9 px-2 sm:px-3",
              "transition-all duration-200",
              isActive && "shadow-md",
              !isActive && "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </Button>
        );
      })}
      
      {/* Submit button for qualification step */}
      {isQualificationStep && onQualificationSubmit && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            variant="default"
            size="sm"
            onClick={onQualificationSubmit}
            className={cn(
              "gap-1 font-medium text-xs h-8 sm:h-9 px-3 sm:px-4",
              "bg-green-600 hover:bg-green-700 text-white",
              "transition-all duration-200 hover:scale-105"
            )}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Submit</span>
          </Button>
        </>
      )}
    </div>
  );
};
