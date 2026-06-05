# Sovereign Eye v4 Deployment Checklist

Use this checklist before deploying to Vercel or Railway.

## 1. Environment Variables

Set these in the deployment platform:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
IPINFO_TOKEN=
NUMVERIFY_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Frontend-safe variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend-only variables:

- `IPINFO_TOKEN`
- `NUMVERIFY_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose backend-only variables in React code, browser storage, or any `VITE_` variable.

## 2. Supabase

- Email/password Auth is enabled.
- Allowed redirect URLs include the production deployment URL.
- `supabase/migrations/20260604000001_supabase_auth_profiles.sql` has been run.
- Required tables exist: `user_profiles`, `roles`, `audit_logs`, `settings`, `orders`, `evidence`, `status`.
- RLS policies are enabled and tested.
- The first production account is registered and confirmed.
- The first production account has the `super_admin` role.

## 3. Local Verification

Run:

```bash
npm install
npm run build
npm test
```

Verify:

- Login page does not show `Supabase Auth is not configured`.
- Register works with a real Supabase email account.
- Login works with a confirmed Supabase account.
- Logout clears the session.
- Password reset email is delivered through Supabase.
- IPinfo lookup works through `/api/ipinfo`.
- Numverify lookup works through `/api/numverify` when `NUMVERIFY_API_KEY` is present.
- Numverify gracefully falls back when `NUMVERIFY_API_KEY` is absent.

## 4. Vercel Settings

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Add all environment variables under Project Settings > Environment Variables.
- Set variables for Production, Preview, and Development as needed.

## 5. Railway Settings

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Railway-provided `PORT` is used automatically.
- Add all environment variables under Service > Variables.

## 6. Final Security Check

- No `IPINFO_TOKEN`, `NUMVERIFY_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` appears in `dist`.
- No backend-only secret is prefixed with `VITE_`.
- Supabase service role key is used only in trusted backend code.
- Production Supabase redirect URLs are correct.
- Production database has RLS enabled on public tables.
