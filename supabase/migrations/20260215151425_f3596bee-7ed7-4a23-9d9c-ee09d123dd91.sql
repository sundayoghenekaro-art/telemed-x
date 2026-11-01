-- Fix infinite recursion: replace the self-referencing SELECT policy on channel_members
-- with a simple "users can read their own memberships" policy
DROP POLICY IF EXISTS "Members can read memberships" ON public.channel_members;

CREATE POLICY "Users can read own memberships"
ON public.channel_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Also allow users to see other members in channels they belong to
-- Using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(_channel_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = _channel_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Members can see co-members"
ON public.channel_members
FOR SELECT
TO authenticated
USING (public.is_channel_member(channel_id, auth.uid()));

-- Also fix the staff_messages SELECT policy which has the same issue
DROP POLICY IF EXISTS "Members can read messages" ON public.staff_messages;
CREATE POLICY "Members can read messages"
ON public.staff_messages
FOR SELECT
TO authenticated
USING (public.is_channel_member(channel_id, auth.uid()));

-- Fix the staff_messages INSERT policy too
DROP POLICY IF EXISTS "Members can send messages" ON public.staff_messages;
CREATE POLICY "Members can send messages"
ON public.staff_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_channel_member(channel_id, auth.uid())
);

-- Fix the existing staff_channels "Members can read channels" policy
DROP POLICY IF EXISTS "Members can read channels" ON public.staff_channels;
CREATE POLICY "Members can read joined channels"
ON public.staff_channels
FOR SELECT
TO authenticated
USING (public.is_channel_member(id, auth.uid()));