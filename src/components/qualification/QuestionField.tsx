import { UseFormReturn } from "react-hook-form";
import { QualificationQuestion } from "@/config/qualificationConfig";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuestionFieldProps {
  question: QualificationQuestion;
  form: UseFormReturn<any>;
}

export const QuestionField = ({ question, form }: QuestionFieldProps) => {
  const inputType = question.inputType || "text";
  const options = question.fieldOptions || [];
  const fieldName = question.id; // Use question.id as form field name

  // Format currency value
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return `$${parseInt(numericValue, 10).toLocaleString()}`;
  };

  // Format percentage value
  const formatPercentage = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    if (!cleanValue) return '';
    return `${cleanValue}%`;
  };

  // Render select as radio for 2-4 options, dropdown for 5+
  if (inputType === 'select') {
    const useRadio = options.length >= 2 && options.length <= 4;

    if (useRadio) {
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  className="flex flex-wrap gap-4"
                >
                  {options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${fieldName}-${option.value}`} />
                      <Label 
                        htmlFor={`${fieldName}-${option.value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              {question.helpText && (
                <FormDescription>{question.helpText}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    // Dropdown for 5+ options
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="w-full max-w-md bg-background">
                  <SelectValue placeholder={question.placeholder || "Select an option"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-popover">
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {question.helpText && (
              <FormDescription>{question.helpText}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Currency input
  if (inputType === 'currency') {
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                placeholder={question.placeholder || "$0"}
                className="max-w-md"
                onChange={(e) => {
                  const formatted = formatCurrency(e.target.value);
                  field.onChange(formatted);
                }}
              />
            </FormControl>
            {question.helpText && (
              <FormDescription>{question.helpText}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Percentage input
  if (inputType === 'percentage') {
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                placeholder={question.placeholder || "0%"}
                className="max-w-md"
                onChange={(e) => {
                  const formatted = formatPercentage(e.target.value);
                  field.onChange(formatted);
                }}
              />
            </FormControl>
            {question.helpText && (
              <FormDescription>{question.helpText}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Number input
  if (inputType === 'number') {
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="number"
                placeholder={question.placeholder || ""}
                className="max-w-md"
              />
            </FormControl>
            {question.helpText && (
              <FormDescription>{question.helpText}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Email input
  if (inputType === 'email') {
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="email"
                placeholder={question.placeholder || "email@example.com"}
                className="max-w-md"
              />
            </FormControl>
            {question.helpText && (
              <FormDescription>{question.helpText}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Date input
  if (inputType === 'date') {
    return (
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                type="date"
                className="max-w-md"
              />
            </FormControl>
            {question.helpText && (
              <FormDescription>{question.helpText}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // Default: text input
  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              {...field}
              placeholder={question.placeholder || ""}
              className="max-w-md"
            />
          </FormControl>
          {question.helpText && (
            <FormDescription>{question.helpText}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
