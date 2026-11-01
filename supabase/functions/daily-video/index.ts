import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_API_BASE = 'https://api.daily.co/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({ error: 'DAILY_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller identity using proper JWT validation.
    // Patients may call without a valid user token — callerId will be null,
    // which is fine for get_token (no ownership check needed).
    const authHeader = req.headers.get('Authorization');
    let callerId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData } = await supabaseClient.auth.getClaims(token);
      callerId = (claimsData?.claims?.sub as string) ?? null;
    }

    const body = await req.json();
    const { action, sessionId, role } = body;

    if (!action || !sessionId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: action, sessionId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to read/write session data (bypasses RLS for server-side ops)
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch session
    const { data: session, error: sessionError } = await serviceSupabase
      .from('telemedicine_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper: call Daily.co REST API
    const dailyFetch = async (path: string, method = 'GET', body?: unknown) => {
      const res = await fetch(`${DAILY_API_BASE}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Daily.co API error ${res.status}: ${text}`);
      return JSON.parse(text);
    };

    // Compute expiry: scheduled_at + duration_minutes + 30 min buffer
    const scheduledAt = new Date(session.scheduled_at);
    const durationMs = (session.duration_minutes + 30) * 60 * 1000;
    const expUnix = Math.floor((scheduledAt.getTime() + durationMs) / 1000);
    const nbfUnix = Math.floor(Date.now() / 1000);

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    if (action === 'create_room') {
      // Only the owning doctor can create rooms.
      // callerId may be null if anon key used — reject in that case.
      if (!callerId || session.doctor_user_id !== callerId) {
        return new Response(JSON.stringify({ error: 'Unauthorized: only the session doctor can start the room' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Reuse existing room if already created
      let roomName: string;
      let roomUrl: string;

      if (session.daily_room_name) {
        roomName = session.daily_room_name;
        roomUrl = session.daily_room_url!;
      } else {
        roomName = `uhes-${session.session_code.toLowerCase()}`;

        const roomPayload = {
          name: roomName,
          privacy: 'private',
          properties: {
            exp: expUnix,
            nbf: nbfUnix,
            enable_recording: 'cloud',
            enable_chat: true,
            enable_screenshare: true,
            start_audio_off: false,
            start_video_off: false,
          },
        };

        const room = await dailyFetch('/rooms', 'POST', roomPayload);
        roomUrl = room.url;

        // Persist room info and update status
        await serviceSupabase.from('telemedicine_sessions').update({
          daily_room_url: roomUrl,
          daily_room_name: roomName,
          status: 'active',
          started_at: new Date().toISOString(),
        }).eq('id', sessionId);
      }

      // Generate owner token for doctor
      const tokenData = await dailyFetch('/meeting-tokens', 'POST', {
        properties: {
          room_name: roomName,
          is_owner: true,
          user_name: `Dr. ${session.doctor_name}`,
          exp: expUnix,
          nbf: nbfUnix,
          enable_recording: true,
        },
      });

      return new Response(JSON.stringify({
        roomUrl,
        roomName,
        token: tokenData.token,
        iframeUrl: `${roomUrl}?t=${tokenData.token}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── GET TOKEN (patient or doctor joining existing room) ──────────────────
    if (action === 'get_token') {
      if (!session.daily_room_name || !session.daily_room_url) {
        return new Response(JSON.stringify({ error: 'Room has not been created yet. The doctor must start the session first.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // SECURITY: Verify the caller is authorized to join this session
      const isDoctor = callerId === session.doctor_user_id;
      const isPatient = callerId === session.patient_user_id;

      if (!isDoctor && !isPatient) {
        return new Response(JSON.stringify({ error: 'Unauthorized: You are not a participant in this session' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isOwner = isDoctor;
      const userName = isOwner
        ? `Dr. ${session.doctor_name}`
        : session.patient_name;

      const tokenData = await dailyFetch('/meeting-tokens', 'POST', {
        properties: {
          room_name: session.daily_room_name,
          is_owner: isOwner,
          user_name: userName,
          exp: expUnix,
          nbf: nbfUnix,
          start_audio_off: !isOwner,
        },
      });

      return new Response(JSON.stringify({
        roomUrl: session.daily_room_url,
        token: tokenData.token,
        iframeUrl: `${session.daily_room_url}?t=${tokenData.token}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE ROOM ──────────────────────────────────────────────────────────
    if (action === 'delete_room') {
      // Only the owning doctor can delete a room
      if (!callerId || session.doctor_user_id !== callerId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!session.daily_room_name) {
        return new Response(JSON.stringify({ success: true, message: 'No room to delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        await dailyFetch(`/rooms/${session.daily_room_name}`, 'DELETE');
      } catch (e) {
        // Room may already be deleted — non-fatal
        console.warn('Room deletion warning:', e);
      }

      await serviceSupabase.from('telemedicine_sessions').update({
        daily_room_url: null,
        daily_room_name: null,
      }).eq('id', sessionId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('daily-video error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
