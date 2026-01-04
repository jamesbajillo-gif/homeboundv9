-- Fix the UPDATE policy to include WITH CHECK clause
-- This was causing UPDATE operations to silently fail (return 0 rows)

DROP POLICY IF EXISTS "Allow public update" ON public.tmdebt_script;

CREATE POLICY "Allow public update"
  ON public.tmdebt_script
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
