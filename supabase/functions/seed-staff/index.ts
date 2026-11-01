import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => chars[x % chars.length]).join('');
}

const SEED_ACCOUNTS = [
  {
    email: "admin@demo.hospital",
    role: "admin",
    full_name: "Dr. Admin",
    department: "Administration",
  },
  {
    email: "physician@demo.hospital",
    role: "physician",
    full_name: "Dr. Sarah Chen",
    department: "Internal Medicine",
  },
  {
    email: "pharmacist@demo.hospital",
    role: "pharmacist",
    full_name: "James Rivera, PharmD",
    department: "Pharmacy",
  },
  {
    email: "lab@demo.hospital",
    role: "lab_technician",
    full_name: "Maria Santos",
    department: "Laboratory",
  },
  {
    email: "radiologist@demo.hospital",
    role: "radiologist",
    full_name: "Dr. Alex Kim",
    department: "Radiology",
  },
];

const SEED_PATIENT = {
  email: "patient@demo.hospital",
  full_name: "Jane Doe",
  date_of_birth: "1990-05-15",
  gender: "female",
  phone: "+1-555-0199",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller - require admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller has admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety: check if seed accounts already exist
    const { data: existingProfiles } = await adminClient
      .from("profiles")
      .select("email")
      .in("email", SEED_ACCOUNTS.map((a) => a.email));

    const existingEmails = new Set(existingProfiles?.map((p) => p.email) || []);
    const toCreate = SEED_ACCOUNTS.filter((a) => !existingEmails.has(a.email));

    if (toCreate.length === 0) {
      return new Response(
        JSON.stringify({
          message: "All seed accounts already exist.",
          accounts: SEED_ACCOUNTS.map((a) => ({
            email: a.email,
            role: a.role,
            name: a.full_name,
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const created = [];
    const errors = [];
    const generatedPasswords: Record<string, string> = {};

    for (const account of toCreate) {
      const password = generateSecurePassword();
      generatedPasswords[account.email] = password;

      // Create auth user (auto-confirmed)
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: account.email,
          password: password,
          email_confirm: true,
          user_metadata: { name: account.full_name, role: account.role },
        });

      if (authError || !authData.user) {
        errors.push({ email: account.email, error: authError?.message });
        continue;
      }

      const userId = authData.user.id;

      // Create profile
      await adminClient.from("profiles").upsert(
        {
          user_id: userId,
          full_name: account.full_name,
          email: account.email,
          department: account.department,
        },
        { onConflict: "user_id" }
      );

      // Assign role
      await adminClient.from("user_roles").upsert(
        { user_id: userId, role: account.role },
        { onConflict: "user_id,role" }
      );

      created.push({
        email: account.email,
        role: account.role,
        name: account.full_name,
        password: password,
      });
    }

    // --- Seed patient account ---
    let patientResult: any = { status: "skipped" };
    const { data: existingPatient } = await adminClient
      .from("patient_accounts")
      .select("email")
      .eq("email", SEED_PATIENT.email)
      .maybeSingle();

    if (!existingPatient) {
      const patientPassword = generateSecurePassword();

      const { data: patientAuth, error: patientAuthErr } =
        await adminClient.auth.admin.createUser({
          email: SEED_PATIENT.email,
          password: patientPassword,
          email_confirm: true,
          user_metadata: { name: SEED_PATIENT.full_name, role: "patient" },
        });

      if (patientAuthErr || !patientAuth.user) {
        patientResult = { status: "error", error: patientAuthErr?.message };
      } else {
        await adminClient.from("patient_accounts").upsert(
          {
            user_id: patientAuth.user.id,
            full_name: SEED_PATIENT.full_name,
            email: SEED_PATIENT.email,
            date_of_birth: SEED_PATIENT.date_of_birth,
            gender: SEED_PATIENT.gender,
            phone: SEED_PATIENT.phone,
          },
          { onConflict: "user_id" }
        );
        patientResult = {
          status: "created",
          email: SEED_PATIENT.email,
          name: SEED_PATIENT.full_name,
          password: patientPassword
        };
      }
    } else {
      patientResult = { status: "exists", email: SEED_PATIENT.email };
    }

    return new Response(
      JSON.stringify({
        message: `Created ${created.length} staff accounts. ${errors.length} errors. IMPORTANT: Save the generated passwords immediately - they cannot be recovered!`,
        created,
        errors: errors.length > 0 ? errors : undefined,
        patient: patientResult,
        all_accounts: [
          ...SEED_ACCOUNTS.map((a) => ({
            email: a.email,
            role: a.role,
            name: a.full_name,
          })),
          { email: SEED_PATIENT.email, role: "patient", name: SEED_PATIENT.full_name },
        ],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error: " + String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
