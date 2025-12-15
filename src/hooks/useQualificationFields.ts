import { useState, useEffect } from 'react';
import { mysqlApi } from '@/lib/mysql-api';

export interface FormField {
  id: number;
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
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const allFields = await mysqlApi.fetchAll<FormField>('qualification_form_fields');
      
      // Filter active fields and sort by display_order
      const activeFields = allFields
        .filter(field => field.is_active)
        .sort((a, b) => a.display_order - b.display_order);

      setFields(activeFields);
    } catch (err: any) {
      console.error('Error fetching qualification fields:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.field_section]) {
      acc[field.field_section] = [];
    }
    acc[field.field_section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  return { fields, groupedFields, loading, error, refetch: fetchFields };
};
