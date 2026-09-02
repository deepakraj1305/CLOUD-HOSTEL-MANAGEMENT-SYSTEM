# HostelCloud — Cloud-Based Smart Hostel Management System

A React + TypeScript + Vite cloud-based hostel management system with Supabase integration and Vercel serverless API routes.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Supabase
- Vercel Serverless Functions

## Project Structure

- `src/` — frontend application
- `src/components/` — reusable UI components
- `src/contexts/` — authentication/context logic
- `src/lib/` — Supabase and Google authentication helpers
- `api/` — Vercel serverless API endpoints
- `public/` — static assets

## Run Locally

1. Install Node.js (LTS recommended).
2. Copy `.env.example` to `.env.local`.
3. Fill in the required Supabase and Google values.
4. Install dependencies:

```bash
npm install
```

5. Start the development server:

```bash
npm run dev
```

6. Create a production build:

```bash
npm run build
```

## Environment Variables

Do **not** commit `.env`, `.env.local`, or Supabase service-role secrets.

For Vercel, add the required environment variables in:

Project Settings → Environment Variables

Required frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If Google authentication is enabled:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_AUTH_PROXY`

For serverless API routes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or GitHub.

## GitHub

After extracting this folder:

```bash
git init
git add .
git commit -m "Initial HostelCloud project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Deployment

The project is structured for Vercel:

- Vite frontend is built with `npm run build`
- API endpoints are under `/api`
- Configure environment variables in Vercel instead of storing secrets in `vercel.json`

## Security Note

The original exported project contained a Supabase service-role secret inside `vercel.json`. That deployment file has been intentionally removed from this GitHub-ready copy. If that secret was ever pushed to a public repository, rotate/revoke it in Supabase and create a new service-role key before deploying.
