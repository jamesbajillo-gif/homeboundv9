-- Create zapier_settings table to store webhook configurations
CREATE TABLE IF NOT EXISTS public.zapier_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  webhook_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.zapier_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to zapier settings" ON public.zapier_settings;
DROP POLICY IF EXISTS "Allow insert/update zapier settings" ON public.zapier_settings;

-- Policy: Anyone can read zapier settings
CREATE POLICY "Allow read access to zapier settings"
  ON public.zapier_settings
  FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert/update zapier settings
CREATE POLICY "Allow insert/update zapier settings"
  ON public.zapier_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_zapier_settings_updated_at ON public.zapier_settings;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_zapier_settings_updated_at
  BEFORE UPDATE ON public.zapier_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint on webhook_url if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'zapier_settings_webhook_url_key'
  ) THEN
    ALTER TABLE public.zapier_settings ADD CONSTRAINT zapier_settings_webhook_url_key UNIQUE (webhook_url);
  END IF;
END $$;

-- Insert default sample webhook from Zapier documentation
-- Use ON CONFLICT to update if already exists
INSERT INTO public.zapier_settings (webhook_url, webhook_name, description, is_active) 
VALUES (
  'https://hooks.zapier.com/hooks/catch/24751495/u10d1kd/',
  'Sample Webhook (Replace with yours)',
  'This is the sample webhook URL from Zapier documentation. Replace this with your actual Zapier webhook URL from your Zap configuration.',
  true
) 
ON CONFLICT (webhook_url) DO UPDATE SET
  is_active = true,
  webhook_name = EXCLUDED.webhook_name,
  description = EXCLUDED.description;
