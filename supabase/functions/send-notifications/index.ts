import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>UHES Notification</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a5c,#2563eb);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">UHES Telemedicine</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Universal Health Enterprise System</p>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:40px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 UHES · All rights reserved</p>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;">If you have questions, contact your healthcare provider.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 16px;color:#64748b;font-size:13px;width:40%;border-bottom:1px solid #f1f5f9;">${escapeHtml(label)}</td>
    <td style="padding:8px 16px;color:#1e293b;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${escapeHtml(value)}</td>
  </tr>`;
}

function ctaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin-top:28px;">
    <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">${label}</a>
  </div>`;
}

function doctorApprovedHtml(data: { doctorName: string; specialty: string; reviewerName: string; portalUrl: string }): string {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#dcfce7;border-radius:50%;margin-bottom:16px;">
        <span style="font-size:28px;">✓</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">Application Approved!</h2>
      <p style="margin:10px 0 0;color:#64748b;font-size:15px;line-height:1.6;">Congratulations, ${escapeHtml(data.doctorName)}. Your telemedicine application has been reviewed and approved.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px;">
      ${infoRow('Specialty', data.specialty)}
      ${infoRow('Reviewed by', data.reviewerName)}
      ${infoRow('Status', 'Approved ✓')}
    </table>
    <p style="color:#64748b;font-size:14px;line-height:1.7;margin-top:20px;">You can now access the doctor portal to start managing your telemedicine sessions. Use the button below to log in with your registered credentials.</p>
    ${ctaButton(data.portalUrl, 'Access Your Doctor Portal')}
  `;
  return baseTemplate(content);
}

function doctorRejectedHtml(data: { doctorName: string; rejectionReason: string; reapplyUrl: string }): string {
  const content = `
    <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">Application Update</h2>
    <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 24px;">Dear ${escapeHtml(data.doctorName)},<br/><br/>Thank you for your interest in joining the UHES Telemedicine platform. After careful review, we are unable to approve your application at this time.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#dc2626;">Reason for Decision</p>
          <p style="margin:0;color:#1e293b;font-size:14px;line-height:1.6;">${escapeHtml(data.rejectionReason)}</p>
        </td>
      </tr>
    </table>
    <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0;">We encourage you to address the concerns above and <a href="${data.reapplyUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">reapply in the future</a>. If you have questions about this decision, please contact our credentialing team.</p>
  `;
  return baseTemplate(content);
}

function sessionReminderHtml(data: {
  patientName: string; doctorName: string; doctorSpecialty: string;
  scheduledAt: string; durationMinutes: number; sessionCode: string; joinUrl: string;
}): string {
  const date = new Date(data.scheduledAt);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#dbeafe;border-radius:50%;margin-bottom:16px;">
        <span style="font-size:28px;">📅</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">Session Confirmed</h2>
      <p style="margin:10px 0 0;color:#64748b;font-size:15px;line-height:1.6;">Hello ${escapeHtml(data.patientName)}, your telemedicine consultation has been successfully booked.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px;">
      ${infoRow('Doctor', `Dr. ${data.doctorName}`)}
      ${infoRow('Specialty', data.doctorSpecialty || 'General Practice')}
      ${infoRow('Date', dateStr)}
      ${infoRow('Time', timeStr)}
      ${infoRow('Duration', `${data.durationMinutes} minutes`)}
    </table>
    <div style="background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;padding:16px 20px;margin-top:16px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#2563eb;">Your Session Code</p>
      <p style="margin:0;font-size:24px;font-weight:800;color:#1e293b;letter-spacing:3px;">${data.sessionCode}</p>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.7;margin-top:20px;">Please join using the button below at your appointment time. Have your session code ready in case you need to enter it manually.</p>
    ${ctaButton(data.joinUrl, 'Join Your Consultation')}
  `;
  return baseTemplate(content);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const callerIsAdmin = async (): Promise<boolean> => {
      const { data } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    };

    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { type } = body;

    if (!type || typeof type !== 'string' || type.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function validateString(val: unknown, maxLen: number): val is string {
      return typeof val === 'string' && val.length > 0 && val.length <= maxLen;
    }
    function validateEmail(val: unknown): val is string {
      return typeof val === 'string' && val.length <= 255 && emailRegex.test(val);
    }

    let to: string;
    let subject: string;
    let html: string;

    const APP_URL = Deno.env.get('APP_URL') || 'https://localhost:8080';

    if (type === 'doctor_approved') {
      if (!(await callerIsAdmin())) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { doctorEmail, doctorName, specialty, reviewerName } = body;
      if (!validateEmail(doctorEmail) || !validateString(doctorName, 200)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      to = doctorEmail;
      subject = 'Your Telemedicine Application Has Been Approved ✓';
      html = doctorApprovedHtml({
        doctorName,
        specialty: specialty || 'General Practice',
        reviewerName: reviewerName || 'UHES Admin',
        portalUrl: `${APP_URL}/telemedicine/doctor-login`,
      });

    } else if (type === 'doctor_rejected') {
      if (!(await callerIsAdmin())) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { doctorEmail, doctorName, rejectionReason } = body;
      if (!validateEmail(doctorEmail) || !validateString(doctorName, 200)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (rejectionReason && !validateString(rejectionReason, 1000)) {
        return new Response(JSON.stringify({ error: 'Rejection reason too long' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      to = doctorEmail;
      subject = 'Your Telemedicine Application — Update';
      html = doctorRejectedHtml({
        doctorName,
        rejectionReason: rejectionReason || 'Please contact us for more information.',
        reapplyUrl: `${APP_URL}/telemedicine/doctor-login`,
      });

    } else if (type === 'session_reminder') {
      const { sessionId, patientAccountId, patientName, doctorName, doctorSpecialty, scheduledAt, durationMinutes, sessionCode } = body;

      if (!sessionId || typeof sessionId !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: sessionRow } = await serviceClient
        .from('telemedicine_sessions')
        .select('id, doctor_user_id, patient_user_id, patient_account_id')
        .eq('id', sessionId)
        .maybeSingle();

      let ownsSession = !!sessionRow && (
        sessionRow.doctor_user_id === userId || sessionRow.patient_user_id === userId
      );

      if (!ownsSession && sessionRow?.patient_account_id) {
        const { data: accountRow } = await serviceClient
          .from('patient_accounts')
          .select('user_id')
          .eq('id', sessionRow.patient_account_id)
          .maybeSingle();
        ownsSession = accountRow?.user_id === userId;
      }

      if (!ownsSession) {
        return new Response(JSON.stringify({ error: 'Not a participant in this session' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let patientEmail: string | null = null;

      if (patientAccountId) {
        const { data: patientData } = await serviceClient
          .from('patient_accounts')
          .select('email')
          .eq('id', patientAccountId)
          .single();
        patientEmail = patientData?.email ?? null;
      }

      if (!patientEmail) {
        // No patient email available — silently succeed (patient may not have a portal account)
        console.log(`No patient email found for session ${sessionId}, skipping reminder.`);
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      to = patientEmail;
      subject = `Your Telemedicine Session is Confirmed — ${new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      html = sessionReminderHtml({
        patientName: patientName || 'Patient',
        doctorName: doctorName || 'Your Doctor',
        doctorSpecialty: doctorSpecialty || 'General Practice',
        scheduledAt,
        durationMinutes: durationMinutes || 30,
        sessionCode,
        joinUrl: `${APP_URL}/telemedicine/patient`,
      });

    } else {
      return new Response(JSON.stringify({ error: 'Unknown notification type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const from = Deno.env.get('RESEND_FROM') || 'UHES Telemedicine <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Email send failed:', data.message);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: data.message ?? null }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in send-notifications:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
