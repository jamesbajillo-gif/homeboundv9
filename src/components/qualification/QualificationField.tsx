import { UseFormReturn } from "react-hook-form";
import {
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormField as FormFieldType } from "@/hooks/useQualificationFields";

interface QualificationFieldProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  showLabel?: boolean;
}

export const QualificationField = ({ field, form, showLabel = false }: QualificationFieldProps) => {
  const isReadOnly = field.field_type === 'phone';

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return '$' + parseInt(num).toLocaleString();
  };

  if (field.field_type === 'select') {
    const options = field.field_options?.options || [];
    const shouldUseRadio = options.length <= 4 && options.length > 0;

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
  }

  if (field.field_type === 'currency') {
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
                onChange={(e) => formField.onChange(formatCurrency(e.target.value))}
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
  }

  if (field.field_type === 'percentage') {
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
  }

  // Default text/email/date input
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
};
