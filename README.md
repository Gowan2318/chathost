# ChatHost

A white-label AI chatbot platform for local businesses. Business owners configure a branded chatbot through a guided builder, pay via Stripe, then embed it on their website with a single script tag.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in values for:

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FIRECRAWL_API_KEY
RESEND_API_KEY
FOUNDER_EMAIL
CRON_SECRET
```

`CRON_SECRET` must also be set in Vercel's project environment variables — Vercel Cron only attaches the `Authorization` header to its invocations of `/api/cron/reconcile` when the variable is set in the deployed environment, not just locally.

## Running locally

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run lint    # eslint
```

The dev/start scripts pass `--use-system-ca` to Next.js, which is required on Windows to resolve SSL certificate issues.
