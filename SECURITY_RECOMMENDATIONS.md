# Security Recommendations for Production Deployment

This document outlines critical security configurations that should be implemented before deploying to production.

## 1. CORS Configuration

### Current State (Development)
All Edge Functions currently use permissive CORS headers:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### Production Recommendation
**CRITICAL**: Restrict CORS to specific domains before production deployment.

#### For Web Application
Replace `"*"` with your actual domain(s):
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://yourdomain.com",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};
```

#### For Multiple Domains
Implement dynamic CORS based on origin:
```typescript
const allowedOrigins = [
  "https://yourdomain.com",
  "https://app.yourdomain.com",
  "https://admin.yourdomain.com"
];

const origin = req.headers.get("origin");
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};
```

#### Affected Edge Functions
All functions need CORS updates:
- `/supabase/functions/bootstrap-admin/index.ts`
- `/supabase/functions/clinical-assistant/index.ts`
- `/supabase/functions/create-staff-account/index.ts`
- `/supabase/functions/daily-video/index.ts`
- `/supabase/functions/lifestyle-ai/index.ts`
- `/supabase/functions/list-staff/index.ts`
- `/supabase/functions/seed-staff/index.ts`
- `/supabase/functions/seed-test-patient/index.ts`
- `/supabase/functions/send-notifications/index.ts`
- `/supabase/functions/send-vitals-report/index.ts`

### Mobile Application
For Capacitor/mobile apps, you may need to allow `capacitor://` or `ionic://` schemes.

## 2. Rate Limiting

### Current State
Some functions have in-memory rate limiting (e.g., `clinical-assistant`), but this is ineffective in multi-instance deployments.

### Production Recommendation
Implement Redis or database-backed rate limiting:

```typescript
// Example using Supabase database for rate limiting
async function checkRateLimit(userId: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('rate_limits')
    .select('count, window_start')
    .eq('user_id', userId)
    .eq('endpoint', 'function-name')
    .maybeSingle();

  const now = new Date();
  const windowStart = data?.window_start ? new Date(data.window_start) : now;
  const windowEnd = new Date(windowStart.getTime() + (windowSeconds * 1000));

  if (now > windowEnd) {
    // Reset window
    await supabase.from('rate_limits').upsert({
      user_id: userId,
      endpoint: 'function-name',
      count: 1,
      window_start: now.toISOString()
    });
    return true;
  }

  if (data && data.count >= limit) {
    return false;
  }

  await supabase.from('rate_limits').upsert({
    user_id: userId,
    endpoint: 'function-name',
    count: (data?.count || 0) + 1,
    window_start: windowStart.toISOString()
  });

  return true;
}
```

## 3. Audit Logging

### Current State
No comprehensive audit logging for sensitive operations.

### Production Recommendation
Implement audit logging for:

#### Financial Operations
- Invoice creation/modification
- Payment processing
- Insurance claim submissions

#### Medical Records
- Patient record access
- Medical record modifications
- Prescription creation

#### Administrative Actions
- User role changes
- Staff account creation/deletion
- RLS policy modifications

#### Example Implementation
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

## 4. Encryption at Rest

### Recommendation
Enable column-level encryption for highly sensitive fields:
- Patient SSN/National ID
- Credit card information (if stored)
- Medical record details

Use Supabase Vault or implement application-level encryption.

## 5. Session Management

### Current Configuration
```typescript
auth: {
  storage: localStorage,
  persistSession: true,
  autoRefreshToken: true,
}
```

### Production Recommendations
- Set session timeout appropriate for healthcare applications (15-30 minutes)
- Implement idle timeout
- Force re-authentication for sensitive operations
- Log all authentication events

```typescript
auth: {
  storage: localStorage,
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: false,
  flowType: 'pkce',
}
```

## 6. API Key Rotation

### Recommendation
Rotate the following keys regularly (every 90 days):
- Supabase service role key
- Daily.co API key
- Any third-party API keys

Document the rotation process and set calendar reminders.

## 7. Content Security Policy (CSP)

### Recommendation
Implement strict CSP headers in your web application:

```html
<meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://mpfumvhneaxwdgwiuzye.supabase.co wss://mpfumvhneaxwdgwiuzye.supabase.co https://api.daily.co;
    frame-src https://daily.co;
  ">
```

## 8. Database Backups

### Recommendation
- Enable automated daily backups
- Test restore procedures monthly
- Implement point-in-time recovery
- Store backups in separate geographic region
- Encrypt backup files

## 9. Monitoring & Alerting

### Recommendation
Set up monitoring for:

#### Security Events
- Failed authentication attempts (>5 in 5 minutes)
- Unauthorized access attempts
- Unusual data access patterns
- Admin action notifications

#### Application Health
- Edge function errors
- Database connection issues
- API rate limit hits
- Slow query performance

#### Compliance
- HIPAA audit log completeness
- Data retention policy compliance
- Session timeout enforcement

## 10. Incident Response Plan

### Recommendation
Document and test procedures for:
- Data breach response
- Service outage recovery
- Unauthorized access detection
- Patient data exposure

## 11. Third-Party Dependencies

### Current State
Multiple npm packages and external services are used.

### Recommendation
- Audit all dependencies quarterly
- Enable Dependabot or similar for vulnerability scanning
- Review and approve all dependency updates
- Maintain a list of approved packages

## 12. Demo/Seed Data

### Current State
The application includes seed functions to create demo accounts.

### Production Recommendation
**CRITICAL**: Remove or disable ALL seed functions in production:
- `/supabase/functions/seed-staff/`
- `/supabase/functions/seed-test-patient/`
- `/supabase/functions/bootstrap-admin/`

These should only exist in development/staging environments.

## 13. Error Messages

### Recommendation
Sanitize all error messages sent to clients:
- Never expose stack traces
- Never expose database schema details
- Never expose internal service names
- Use generic error messages for authentication failures

## 14. Multi-Factor Authentication (MFA)

### Recommendation
Enforce MFA for:
- All administrative accounts
- Billing staff accounts
- Access to PHI (Protected Health Information)

Supabase supports MFA - enable it in production.

## 15. Password Policies

### Current State
Generated passwords use 16 random characters.

### Recommendation
Enforce password policies:
- Minimum 12 characters
- Require uppercase, lowercase, number, special character
- Password expiration (90 days for admin, 180 days for regular users)
- Password history (prevent reuse of last 5 passwords)
- Account lockout after 5 failed attempts

## Implementation Priority

### Critical (Before Production)
1. Restrict CORS headers
2. Remove/disable seed functions
3. Implement audit logging
4. Set up database backups
5. Enable MFA for admin accounts

### High Priority (Within 30 days)
6. Implement rate limiting
7. Set up monitoring & alerting
8. Create incident response plan
9. Encrypt sensitive fields
10. Configure session timeouts

### Medium Priority (Within 90 days)
11. Implement CSP headers
12. Set up dependency scanning
13. Document key rotation procedures
14. Conduct security audit
15. Implement password policies

## Compliance Considerations

### HIPAA Requirements
This application handles PHI (Protected Health Information) and must comply with HIPAA:
- Implement all security recommendations above
- Conduct annual risk assessments
- Maintain Business Associate Agreements (BAAs) with all vendors
- Document all security incidents
- Train all staff on HIPAA compliance

### Data Retention
- Define and implement data retention policies
- Automatic purging of old records per policy
- Patient right to deletion (GDPR/HIPAA)

## Contact & Support

For security concerns or questions about these recommendations, contact your security team or DevOps lead.

Last Updated: 2026-02-22
