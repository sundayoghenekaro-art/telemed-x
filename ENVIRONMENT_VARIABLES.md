# Environment Variables Documentation

This document describes all environment variables used in the TeleMedX application.

## Required Environment Variables

### Frontend Environment Variables

All frontend environment variables must be prefixed with `VITE_` to be exposed to the browser by Vite.

#### Supabase Configuration

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key for client-side auth | Your anon key from Supabase dashboard |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Alias for anon key (for compatibility) | Same value as VITE_SUPABASE_ANON_KEY |

**Note:** Both `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` should contain the same value. The codebase uses both names for historical compatibility reasons.

### Backend Environment Variables (Edge Functions)

These are automatically available in Supabase Edge Functions and should NOT be added to your `.env` file:

| Variable Name | Description | Auto-configured |
|--------------|-------------|-----------------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |
| `SUPABASE_DB_URL` | Direct database connection URL | Yes |

### Third-Party Service Keys

| Variable Name | Description | Required For | Auto-configured |
|--------------|-------------|--------------|-----------------|
| `DAILY_API_KEY` | Daily.co API key for video conferencing | Telemedicine video calls | Yes (in Edge Functions) |

## Setup Instructions

### 1. Create Your `.env` File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy the following:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. Update Your `.env` File

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

## Environment Files

| File | Purpose | Git Status |
|------|---------|------------|
| `.env` | Local development environment variables | Ignored (in .gitignore) |
| `.env.example` | Template showing required variables | Committed to Git |

## Security Best Practices

1. **Never commit `.env` to Git** - It's already in `.gitignore`
2. **Never expose service role keys** - They should only be used server-side in Edge Functions
3. **Rotate keys regularly** - Especially if accidentally exposed
4. **Use different keys for dev/staging/production** - Maintain separate Supabase projects

## Troubleshooting

### Build Fails Due to Missing Environment Variables

If you see errors about missing environment variables during build:

1. Verify `.env` file exists in project root
2. Check all required variables are present
3. Restart your dev server after changing `.env`

### Environment Variables Not Loading

1. **Verify file location** - `.env` must be in project root (same level as `package.json`)
2. **Check variable naming** - Must start with `VITE_` for frontend access
3. **Restart dev server** - Vite only reads `.env` on startup
4. **Check for quotes** - Values with spaces need quotes, but simple values don't

### Mixed URL/Key Configuration

If you see network errors or auth failures:

1. Ensure both `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` have the same value
2. Verify your Supabase URL matches your actual project
3. Check keys haven't expired or been revoked

## For Android Builds

When building for Android using Capacitor, environment variables are bundled during the build process:

```bash
npm run build:mobile
```

This command:
1. Reads environment variables from `.env`
2. Bundles them into the production build
3. Syncs to Android platform

Make sure your `.env` file is configured before running mobile builds.

## Files Using Environment Variables

### Direct Usage
- `src/integrations/supabase/client.ts` - Main Supabase client
- `src/components/clinical/ClinicalAssistant.tsx` - Clinical assistant edge function
- `src/components/telemedicine/*` - Telemedicine video components
- `src/pages/PatientPortal.tsx` - Patient portal

### Indirect Usage (via Supabase client)
All components that import and use the Supabase client indirectly use these environment variables.
