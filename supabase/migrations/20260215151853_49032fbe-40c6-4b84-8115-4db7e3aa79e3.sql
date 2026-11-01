-- Allow authenticated users to read basic profile info (needed for sender names in messaging)
CREATE POLICY "Authenticated users can read profiles for messaging"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);