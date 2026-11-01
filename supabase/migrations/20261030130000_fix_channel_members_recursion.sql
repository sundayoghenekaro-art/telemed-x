/*
# Fix infinite recursion on public.channel_members

## Problem
Migration 20260331174041 rewrote "Members can see co-members" as a self-referencing
EXISTS subquery:

  USING (EXISTS (SELECT 1 FROM public.channel_members cm WHERE ...))

Evaluating that policy requires reading channel_members, which re-applies the same
policy, so every SELECT/INSERT on the table fails with:
  ERROR 42P17: infinite recursion detected in policy for relation "channel_members"

## Fix
Restore the non-recursive design from migration 20260215151425: use the
SECURITY DEFINER helper public.is_channel_member(channel_id, user_id), which reads
the table as the function owner and therefore bypasses RLS. The "Users can insert
memberships" WITH CHECK has the same shape and is rewritten the same way.

## Safety
- Idempotent: policies are dropped before creation.
- Helper already exists and is granted to authenticated.
*/

DROP POLICY IF EXISTS "Members can see co-members" ON public.channel_members;
CREATE POLICY "Members can see co-members" ON public.channel_members
  FOR SELECT TO authenticated
  USING (public.is_channel_member(channel_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can insert memberships" ON public.channel_members;
CREATE POLICY "Users can insert memberships" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_channel_member(channel_id, (SELECT auth.uid()))
  );
