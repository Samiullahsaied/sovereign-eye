# Sovereign Eye v4

Sovereign Eye v4 is a Vite + React legal operations dashboard with Supabase Auth, role-based access control, Supabase-backed operational records, and backend-only IPinfo lookup. The original RTL/Pashto command-center design direction is preserved.

## Local Requirements

- Node.js 22 or newer
- npm
- A Supabase project with Email/Password Auth enabled
- An IPinfo token stored only in backend/server environment variables
- Optional: a Numverify API key stored only in backend/server environment variables

## Environment Setup

Create this file in the project root:

```text
C:\Users\kainat saied\OneDrive\Documentos\SAVE\.env
```

Copy `.env.example` into `.env` and fill the values:

```text
IPINFO_TOKEN=your_ipinfo_token
NUMVERIFY_API_KEY=your_optional_numverify_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Where to get the two frontend-safe Supabase values:

- `VITE_SUPABASE_URL`: Supabase Dashboard > Project Settings > API > Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard > Project Settings > API > anon public key or publishable key

Only variables prefixed with `VITE_` are bundled into the browser by Vite. Do not put `IPINFO_TOKEN`, `NUMVERIFY_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in React code. IPinfo is called only through `/api/ipinfo`; Numverify is called only through `/api/numverify` and is disabled automatically when no key exists.

## Supabase Database Setup

Open Supabase Dashboard > SQL Editor and run:

```text
supabase/migrations/20260604000001_supabase_auth_profiles.sql
```

This creates the required production tables:

- `user_profiles`
- `roles`
- `audit_logs`
- `settings`

It also creates the existing app operational tables needed by the UI:

- `orders`
- `evidence`
- `status`

The migration enables RLS, creates role policies, creates a profile trigger on `auth.users`, and makes the first registered account `Super Admin`. If Auth users already exist, the oldest profile is promoted to `Super Admin` when no Super Admin exists.

If Supabase returns `Could not find the table 'public.user_profiles' in the schema cache`, run the migration above in the SQL Editor. The final statement in the migration is `notify pgrst, 'reload schema';`, which refreshes the Supabase API schema cache after creating the table.

Roles:

- `super_admin` - Super Admin / ستر اډمین
- `admin` - System Administrator / سیستم اډمین
- `operations_officer` - Operations Officer / عملیاتي مسئول
- `legal_supervisor` - Legal Supervisor / قانوني ناظر
- `viewer` - Viewer / کتونکی

## Authentication

The login screen supports:

- Register
- Login
- Logout
- Password reset email
- New password update after Supabase password-recovery redirect

No username/password shortcuts are included. Passwords and sessions are handled only by Supabase Auth. Roles are read from `public.user_profiles` joined to `public.roles`.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5188/
```

After running the SQL migration and adding `.env`, register the first account from the app. That first registered account becomes `Super Admin`.

## Build

```bash
npm run build
```

For a local production-style server with the API endpoints:

```bash
npm run start
```

## Vercel Deployment

Use these Vercel project settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Add these Environment Variables in Vercel Project Settings for Production, Preview, and Development:

```text
IPINFO_TOKEN=your_ipinfo_token
NUMVERIFY_API_KEY=your_optional_numverify_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

In Supabase Auth settings, add your deployed Vercel URL to allowed redirect URLs so password reset and email confirmation links can return to the app.

## Railway Deployment

Use Railway when you want to run the Node backend server from `server/index.js` instead of Vercel serverless functions.

Recommended Railway settings:

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Public port: Railway provides `PORT`; the app reads it automatically.

Add these variables in Railway > Service > Variables:

```text
IPINFO_TOKEN=your_ipinfo_token
NUMVERIFY_API_KEY=your_optional_numverify_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

In Supabase Auth settings, add your deployed Railway domain to allowed redirect URLs.

## Environment Variable Scope

Frontend-safe variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

These two values are intentionally public. They are required by Supabase Auth in the browser and are protected by Supabase Auth policies and RLS, not by secrecy.

Backend-only variables:

```text
IPINFO_TOKEN
NUMVERIFY_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Never place backend-only variables in React files, Vite client code, browser storage, or any variable prefixed with `VITE_`. `IPINFO_TOKEN` and `NUMVERIFY_API_KEY` are used only by backend API routes. `SUPABASE_SERVICE_ROLE_KEY` is for trusted backend writes only and must never be exposed to the browser.

## Launch Checklist

1. Run the SQL migration in Supabase SQL Editor.
2. Create `.env` in the project root with the values above.
3. Restart `npm run dev`.
4. Register the first account in the app.
5. Confirm that account appears in `public.user_profiles` with role `super_admin`.
6. Run `npm run build`.
7. Add the same environment variables in Vercel and deploy.

## Security Notes

- `IPINFO_TOKEN` stays backend-only.
- `NUMVERIFY_API_KEY` stays backend-only and is optional.
- `SUPABASE_SERVICE_ROLE_KEY` stays backend-only.
- The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- RLS is enabled on all public tables created by the migration.
- Authorization uses database roles, not user-editable Supabase metadata.
