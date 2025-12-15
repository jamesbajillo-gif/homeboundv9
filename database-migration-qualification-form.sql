-- Create qualification_form_fields table to store configurable form fields
CREATE TABLE IF NOT EXISTS public.qualification_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- text, number, select, currency, percentage
  field_section TEXT NOT NULL, -- property, loan, financial
  field_options JSONB, -- For select fields
  is_required BOOLEAN DEFAULT true,
  zapier_field_name TEXT, -- Mapped field name for Zapier
  placeholder TEXT,
  help_text TEXT,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.qualification_form_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to form fields" ON public.qualification_form_fields;
DROP POLICY IF EXISTS "Allow manage form fields" ON public.qualification_form_fields;

-- Policy: Anyone can read form fields
CREATE POLICY "Allow read access to form fields"
  ON public.qualification_form_fields
  FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can manage form fields
CREATE POLICY "Allow manage form fields"
  ON public.qualification_form_fields
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_qualification_form_fields_updated_at ON public.qualification_form_fields;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_qualification_form_fields_updated_at
  BEFORE UPDATE ON public.qualification_form_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default form fields
INSERT INTO public.qualification_form_fields (field_name, field_label, field_type, field_section, field_options, is_required, zapier_field_name, placeholder, help_text, validation_rules, display_order) VALUES
  -- Personal Information Section
  ('customer_email', 'Customer Email Address', 'email', 'personal', NULL, true, 'borrower_email', 'john.doe@email.com', 'Email address for loan communications', NULL, 1),
  ('borrower_first_name', 'First Name', 'text', 'personal', NULL, true, 'borrower_first_name', 'John', NULL, NULL, 2),
  ('borrower_last_name', 'Last Name', 'text', 'personal', NULL, true, 'borrower_last_name', 'Doe', NULL, NULL, 3),
  ('borrower_phone', 'Phone Number', 'phone', 'personal', NULL, true, 'borrower_phone', '(555) 123-4567', 'Phone number from lead data', NULL, 4),
  ('borrower_date_of_birth', 'Birthday', 'date', 'personal', NULL, true, 'borrower_date_of_birth', 'MM/DD/YYYY', NULL, NULL, 5),
  ('borrower_address', 'Address', 'text', 'personal', NULL, true, 'borrower_address', '123 Main Street', NULL, NULL, 6),
  ('borrower_state', 'State', 'text', 'personal', NULL, true, 'borrower_state', 'CA', '2-letter state code', NULL, 7),
  ('borrower_city', 'City', 'text', 'personal', NULL, true, 'borrower_city', 'Los Angeles', NULL, NULL, 8),
  ('borrower_postal_code', 'ZIP Code', 'text', 'personal', NULL, true, 'borrower_postal_code', '90210', '5-digit ZIP code', NULL, 9),
  
  -- Property Information Section
  ('property_value', 'Property Value', 'currency', 'property', NULL, true, 'property_value', '$1,000,000', NULL, '{"min": 0, "max": 10000000}'::jsonb, 10),
  ('property_type', 'Property Type', 'select', 'property', '{"options":[{"value":"SINGLE_FAMILY_DETACHED","label":"Single Family Detached"},{"value":"SINGLE_FAMILY_ATTACHED","label":"Single Family Attached"},{"value":"TWO_UNITS","label":"2 Units"},{"value":"THREE_UNITS","label":"3 Units"}]}'::jsonb, true, 'property_type', 'Select Type', NULL, NULL, 11),
  ('property_occupancy', 'Property Usage Type', 'select', 'property', '{"options":[{"value":"PrimaryResidence","label":"Primary Residence"},{"value":"Investment","label":"Investment"},{"value":"SecondHome","label":"Second Home"}]}'::jsonb, true, 'property_occupancy', 'Select Usage', NULL, NULL, 12),
  ('refinance_type', 'Refinance Type', 'select', 'property', '{"options":[{"value":"CashOut","label":"Cash-Out Refinance"},{"value":"NoCashOut","label":"Rate & Term Refinance"},{"value":"LimitedCashOut","label":"Limited Cash-Out Refinance"}]}'::jsonb, true, 'refinance_type', 'Select Type', NULL, NULL, 13),
  
  -- Current Loan Information Section
  ('current_mortgage_balance', 'Current Mortgage Balance', 'currency', 'loan', NULL, true, 'current_mortgage_balance', '$400,000', NULL, '{"min": 0}'::jsonb, 20),
  ('current_interest_rate', 'Current Interest Rate', 'percentage', 'loan', NULL, true, 'current_interest_rate', '6.5%', NULL, '{"min": 0, "max": 100}'::jsonb, 21),
  
  -- Financial Information Section
  ('annual_income', 'Annual Household Income', 'currency', 'financial', NULL, true, 'annual_income', '$100,000', NULL, '{"min": 0}'::jsonb, 30),
  ('credit_score_range', 'Credit Score Range', 'select', 'financial', '{"options":[{"value":"780-850","label":"Excellent (780-850)"},{"value":"720-779","label":"Very Good (720-779)"},{"value":"680-719","label":"Good (680-719)"},{"value":"620-679","label":"Fair (620-679)"},{"value":"500-619","label":"Poor (500-619)"}]}'::jsonb, true, 'credit_score_range', 'Select Range', NULL, NULL, 31),
  ('monthly_debt_payments', 'Monthly Debt Payments', 'currency', 'financial', NULL, true, 'monthly_debt_payments', '$2,500', 'Include credit cards, car loans, other monthly debts', '{"min": 0}'::jsonb, 32)
  
ON CONFLICT (field_name) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  field_section = EXCLUDED.field_section,
  field_options = EXCLUDED.field_options,
  is_required = EXCLUDED.is_required,
  zapier_field_name = EXCLUDED.zapier_field_name,
  placeholder = EXCLUDED.placeholder,
  help_text = EXCLUDED.help_text,
  validation_rules = EXCLUDED.validation_rules,
  display_order = EXCLUDED.display_order;
