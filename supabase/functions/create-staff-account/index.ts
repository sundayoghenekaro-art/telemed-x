import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StaffAccount {
  email: string;
  full_name: string;
  role: string;
  department?: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
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

    // Verify caller is admin using their JWT
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
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accounts } = await req.json() as { accounts: StaffAccount[] };

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "No accounts provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate accounts (max 50 at a time)
    if (accounts.length > 50) {
      return new Response(JSON.stringify({ error: "Maximum 50 accounts per request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["admin", "physician", "nurse", "pharmacist", "lab_technician", "radiologist", "receptionist", "billing"];
    const results: { email: string; success: boolean; error?: string }[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const account of accounts) {
      try {
        // Validate required fields
        if (!account.email || !account.full_name || !account.role) {
          results.push({ email: account.email || "unknown", success: false, error: "Missing required fields" });
          continue;
        }
        // Validate email format and length
        if (typeof account.email !== 'string' || account.email.length > 255 || !emailRegex.test(account.email)) {
          results.push({ email: String(account.email).slice(0, 50), success: false, error: "Invalid email format" });
          continue;
        }
        // Validate name length
        if (typeof account.full_name !== 'string' || account.full_name.length > 200 || account.full_name.trim().length === 0) {
          results.push({ email: account.email, success: false, error: "Name must be 1-200 characters" });
          continue;
        }
        if (!validRoles.includes(account.role)) {
          results.push({ email: account.email, success: false, error: `Invalid role: ${account.role}` });
          continue;
        }
        // Validate optional fields
        if (account.department && (typeof account.department !== 'string' || account.department.length > 100)) {
          results.push({ email: account.email, success: false, error: "Department must be under 100 characters" });
          continue;
        }
        if (account.phone && (typeof account.phone !== 'string' || account.phone.length > 20)) {
          results.push({ email: account.email, success: false, error: "Phone must be under 20 characters" });
          continue;
        }

        // Create user with invite (sends email automatically)
        const { data: newUser, error: createError } = await adminClient.auth.admin.inviteUserByEmail(
          account.email,
          {
            data: { full_name: account.full_name, role: account.role },
          }
        );

        if (createError) {
          results.push({ email: account.email, success: false, error: createError.message });
          continue;
        }

        // Create profile
        await adminClient.from("profiles").insert({
          user_id: newUser.user.id,
          full_name: account.full_name,
          email: account.email,
          department: account.department || null,
          phone: account.phone || null,
        });

        // Assign role
        await adminClient.from("user_roles").insert({
          user_id: newUser.user.id,
          role: account.role,
        });

        results.push({ email: account.email, success: true });
      } catch (err) {
        results.push({ email: account.email || "unknown", success: false, error: "Unexpected error" });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ results, summary: { total: results.length, success: successCount, failed: failCount } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
