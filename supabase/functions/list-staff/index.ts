import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all profiles with their roles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch profiles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      return new Response(JSON.stringify({ error: "Failed to fetch roles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch auth users to get email confirmation status
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers();

    // Build a map of user_id -> auth info
    const authMap = new Map<string, { confirmed: boolean; last_sign_in: string | null }>();
    if (authUsers) {
      for (const u of authUsers) {
        authMap.set(u.id, {
          confirmed: !!u.email_confirmed_at,
          last_sign_in: u.last_sign_in_at || null,
        });
      }
    }

    // Build role map
    const roleMap = new Map<string, string[]>();
    if (roles) {
      for (const r of roles) {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      }
    }

    // Combine
    const staff = (profiles || []).map((p) => {
      const auth = authMap.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        department: p.department,
        phone: p.phone,
        roles: roleMap.get(p.user_id) || [],
        confirmed: auth?.confirmed ?? false,
        last_sign_in: auth?.last_sign_in ?? null,
        created_at: p.created_at,
      };
    });

    return new Response(JSON.stringify({ staff }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
