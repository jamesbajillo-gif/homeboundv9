-- Update user_groups table to simplify structure
-- Drop old columns and add new group_type column

-- Drop old columns if they exist
ALTER TABLE public.user_groups 
  DROP COLUMN IF EXISTS inbound_group,
  DROP COLUMN IF EXISTS outbound_group;

-- Add new group_type column
ALTER TABLE public.user_groups 
  ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT 'inbound';

-- Add check constraint to ensure only valid values
ALTER TABLE public.user_groups
  DROP CONSTRAINT IF EXISTS user_groups_group_type_check;

ALTER TABLE public.user_groups
  ADD CONSTRAINT user_groups_group_type_check 
  CHECK (group_type IN ('inbound', 'outbound'));

-- Update the index (it should still work with user_identifier)
-- No changes needed to the existing index
