-- Allow anyone (including anonymous users) to view profiles
-- This is needed so users can select names when creating numbers without logging in
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);