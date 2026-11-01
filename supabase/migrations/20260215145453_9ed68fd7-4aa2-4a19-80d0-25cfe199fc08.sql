
-- Channels for staff messaging (role-based channels + direct messages)
CREATE TABLE public.staff_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'role' CHECK (type IN ('role', 'direct')),
  -- For role channels: comma-separated role pair e.g. 'physician,pharmacist'
  role_pair text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.staff_channels ENABLE ROW LEVEL SECURITY;

-- Channel members
CREATE TABLE public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.staff_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.staff_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see channels they are members of
CREATE POLICY "Members can read channels"
  ON public.staff_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_members.channel_id = staff_channels.id
        AND channel_members.user_id = auth.uid()
    )
  );

-- Authenticated users can create channels
CREATE POLICY "Authenticated users can create channels"
  ON public.staff_channels FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Members can read channel membership
CREATE POLICY "Members can read memberships"
  ON public.channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
        AND cm.user_id = auth.uid()
    )
  );

-- Authenticated users can join channels (insert memberships)
CREATE POLICY "Users can insert memberships"
  ON public.channel_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own membership (last_read_at)
CREATE POLICY "Users can update own membership"
  ON public.channel_members FOR UPDATE
  USING (user_id = auth.uid());

-- Members can read messages in their channels
CREATE POLICY "Members can read messages"
  ON public.staff_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_members.channel_id = staff_messages.channel_id
        AND channel_members.user_id = auth.uid()
    )
  );

-- Members can send messages to their channels
CREATE POLICY "Members can send messages"
  ON public.staff_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_members.channel_id = staff_messages.channel_id
        AND channel_members.user_id = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
