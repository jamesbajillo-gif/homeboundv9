import { UseFormReturn } from "react-hook-form";
import { QualificationSection as SectionType, QualificationQuestion, getEnabledQuestions } from "@/config/qualificationConfig";
import { QualificationField } from "./QualificationField";
import { FormField as FormFieldType } from "@/hooks/useQualificationFields";

interface QualificationSectionProps {
  section: SectionType;
  fields: FormFieldType[];
  form: UseFormReturn<any>;
}

export const QualificationSection = ({ section, fields, form }: QualificationSectionProps) => {
  const enabledQuestions = getEnabledQuestions(section);

  // Create a map of field names to fields for quick lookup
  const fieldsByName = fields.reduce((acc, field) => {
    acc[field.field_name] = field;
    return acc;
  }, {} as Record<string, FormFieldType>);

  // Track which fields have been rendered via questions
  const renderedFields = new Set<string>();

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="border-b border-border pb-4">
        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
        )}
      </div>

      {/* Questions with Fields */}
      <div className="space-y-6 pt-2">
        {enabledQuestions.map((question, questionIndex) => {
          const matchedField = question.fieldName ? fieldsByName[question.fieldName] : null;
          
          if (matchedField) {
            renderedFields.add(question.fieldName!);
          }

          return (
            <div key={question.id} className="space-y-3">
              {/* Question */}
              <div className="flex items-start gap-3">
                <span className="text-base font-medium text-foreground min-w-[2rem] pt-0.5">
                  {questionIndex + 1}.
                </span>
                <p className="text-base font-medium text-foreground flex-1 leading-relaxed">
                  {question.question}
                  {matchedField?.is_required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
              </div>

              {/* Input Field (if mapped) */}
              {matchedField && (
                <div className="ml-11">
                  <QualificationField field={matchedField} form={form} showLabel={false} />
                </div>
              )}
            </div>
          );
        })}

        {/* Render any fields that weren't matched to questions */}
        {fields
          .filter(field => !renderedFields.has(field.field_name))
          .map(field => (
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
                <QualificationField field={field} form={form} showLabel={false} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
