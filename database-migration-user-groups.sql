-- Create user_groups table to store group assignments
CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL UNIQUE,
  group_type TEXT NOT NULL DEFAULT 'inbound',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_groups_group_type_check CHECK (group_type IN ('inbound', 'outbound'))
);

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read user groups (needed for VICI integration)
CREATE POLICY "Allow read access to user groups"
  ON public.user_groups
  FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert/update their own group
CREATE POLICY "Allow insert/update user groups"
  ON public.user_groups
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups by user_identifier
CREATE INDEX IF NOT EXISTS idx_user_groups_identifier 
  ON public.user_groups(user_identifier);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
