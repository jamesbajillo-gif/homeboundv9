import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface FormField {
  id: string;
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
      const { data, error: fetchError } = await supabase
        .from('qualification_form_fields')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setFields(data || []);
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
