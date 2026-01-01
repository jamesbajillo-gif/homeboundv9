import { useQuery } from '@tanstack/react-query';
import { mysqlApi } from '@/lib/mysqlApi';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface FormField {
  id: number | string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_section: string;
  field_options: any;
  is_required: boolean;
  zapier_field_name: string | null;
  placeholder: string | null;
  help_text: string | null;
  validation_rules: any;
  display_order: number;
  is_active: boolean;
}

export const useQualificationFields = () => {
  const { data: fields = [], isLoading: loading, error } = useQuery({
    queryKey: QUERY_KEYS.formFields.active,
    queryFn: async () => {
      const data = await mysqlApi.getAll<FormField>(
        'homebound_qualification_form_fields',
        {
          where: { is_active: true },
          orderBy: 'display_order',
          order: 'ASC'
        }
      );
      return data;
    },
  });

  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.field_section]) {
      acc[field.field_section] = [];
    }
    acc[field.field_section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  return { 
    fields, 
    groupedFields, 
    loading, 
    error: error ? (error as Error).message : null,
    refetch: () => {} // React Query handles refetching automatically
  };
};
