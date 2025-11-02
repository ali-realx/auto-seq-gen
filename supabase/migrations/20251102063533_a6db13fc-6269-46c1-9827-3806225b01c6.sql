-- Drop the restrictive policy that requires auth
DROP POLICY IF EXISTS "Users can view documents based on access level" ON public.documents;

-- Create a new policy that allows anyone (including anonymous users) to view all documents
CREATE POLICY "Anyone can view all documents"
ON public.documents
FOR SELECT
USING (true);