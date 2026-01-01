import { UseFormReturn } from "react-hook-form";
import { QualificationSection as SectionType, getEnabledQuestions } from "@/config/qualificationConfig";
import { QuestionField } from "./QuestionField";

interface QualificationSectionProps {
  section: SectionType;
  form: UseFormReturn<any>;
}

export const QualificationSection = ({ section, form }: QualificationSectionProps) => {
  const enabledQuestions = getEnabledQuestions(section);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="border-b border-border pb-4">
        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
        )}
      </div>

      {/* Questions with Inline Fields */}
      <div className="space-y-6 pt-2">
        {enabledQuestions.map((question, questionIndex) => (
          <div key={question.id} className="space-y-3">
            {/* Question */}
            <div className="flex items-start gap-3">
              <span className="text-base font-medium text-foreground min-w-[2rem] pt-0.5">
                {questionIndex + 1}.
              </span>
              <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                {question.question}
                {question.isRequired && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </p>
            </div>

            {/* Input Field based on question's inline config */}
            <div className="ml-11">
              <QuestionField question={question} form={form} />
            </div>
          </div>
        ))}

        {enabledQuestions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No questions configured for this section.
          </p>
        )}
      </div>
    </div>
  );
};
