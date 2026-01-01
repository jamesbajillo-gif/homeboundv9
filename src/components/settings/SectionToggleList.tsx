import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, CheckSquare, XSquare, FileQuestion } from "lucide-react";
import { useMasterQualificationConfig } from "@/hooks/useMasterQualificationConfig";
import { useSectionToggle } from "@/hooks/useSectionToggle";
import { useNavigate } from "react-router-dom";

interface SectionToggleListProps {
  scriptType: string;
  title?: string;
}

export const SectionToggleList = ({ scriptType, title = "Qualification Sections" }: SectionToggleListProps) => {
  const navigate = useNavigate();
  const { config, isLoading: isLoadingConfig } = useMasterQualificationConfig();
  const {
    enabledSectionIds,
    isLoading: isLoadingToggle,
    isSaving,
    toggleSection,
    enableAllSections,
    disableAllSections,
    isSectionEnabled,
  } = useSectionToggle(scriptType);

  const isLoading = isLoadingConfig || isLoadingToggle;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const hasSections = config.sections.length > 0;
  const enabledMasterSections = config.sections.filter((s) => s.enabled);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {hasSections && enabledMasterSections.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => enableAllSections(enabledMasterSections.map((s) => s.id))}
              disabled={isSaving}
              className="gap-1"
            >
              <CheckSquare className="h-3 w-3" />
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disableAllSections}
              disabled={isSaving}
              className="gap-1"
            >
              <XSquare className="h-3 w-3" />
              Disable All
            </Button>
          </div>
        )}
      </div>

      {!hasSections ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileQuestion className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="mb-2">No questionnaire sections configured yet.</p>
          <p className="text-sm mb-4">
            Create sections in Settings → Forms first.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/settings/forms")}>
            <Settings className="h-4 w-4 mr-2" />
            Go to Forms Settings
          </Button>
        </div>
      ) : enabledMasterSections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileQuestion className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="mb-2">All sections are disabled in the master config.</p>
          <p className="text-sm mb-4">
            Enable sections in Settings → Forms to use them here.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/settings/forms")}>
            <Settings className="h-4 w-4 mr-2" />
            Go to Forms Settings
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Select which sections from the master questionnaire to include in this script's qualification form.
          </p>
          {enabledMasterSections.map((section) => {
            const isEnabled = isSectionEnabled(section.id);
            const enabledQuestions = section.questions.filter((q) => q.enabled);

            return (
              <div
                key={section.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isEnabled ? "bg-card" : "bg-muted/30 opacity-70"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{section.title}</span>
                    <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
                      {enabledQuestions.length} questions
                    </Badge>
                    {!isEnabled && (
                      <Badge variant="outline" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                  )}
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => toggleSection(section.id, checked)}
                  disabled={isSaving}
                />
              </div>
            );
          })}
          <div className="pt-4 border-t mt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Configure sections in{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => navigate("/settings/forms")}
              >
                Settings → Forms
              </Button>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};
