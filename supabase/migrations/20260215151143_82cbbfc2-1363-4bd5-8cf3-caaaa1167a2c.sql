-- Allow authenticated users to find role-based channels by role_pair
-- This is needed so users can discover channels before joining them
CREATE POLICY "Authenticated users can find role channels"
ON public.staff_channels
FOR SELECT
TO authenticated
USING (type = 'role');

-- Also allow finding direct channels by role_pair (which stores sorted user IDs for DMs)
CREATE POLICY "Users can find their direct channels"
ON public.staff_channels
FOR SELECT
TO authenticated
USING (type = 'direct' AND role_pair LIKE '%' || auth.uid()::text || '%');