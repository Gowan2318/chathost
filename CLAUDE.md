# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**VestaChatHost** — a white-label AI chatbot platform for local businesses. Business owners configure a branded chatbot through a 6-step guided builder, pay via Stripe, then embed it on their website with a single script tag.

## Commands

```bash
# Development
node --use-system-ca ./node_modules/next/dist/bin/next dev

# Production build
next build

# Lint
eslint
```

The `--use-system-ca` flag is required for dev/start on Windows to resolve SSL certificate issues.

## Environment Variables

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
CRON_SECRET
```

Copy `.env.local.example` to `.env.local` and fill in values.

**`CRON_SECRET` must also be added to Vercel's project environment variables** (Project → Settings → Environment Variables) — Vercel Cron only attaches the `Authorization: Bearer <CRON_SECRET>` header to its invocations of `/api/cron/reconcile` when that variable is set in the deployed environment, not just locally.

## Architecture

### Data flow (end-to-end)

1. **Builder** (`app/builder/page.js`) — 6-step client-side form collecting business info, branding, mascot, and quick replies
2. **Submit** — `buildChatbotConfig(form, businessInfo)` creates a config object; saved to Supabase `chatbots` table with a `crypto.randomUUID()` as `client_id`
3. **Stripe checkout** — launched with `client_id` as `client_reference_id` and `supportEmail` prefilled
4. **Post-payment** — customer receives embed code: `<script src="https://vestachathost.com/widget.js?id={clientId}">`
5. **Widget runtime** — fetches config from `/api/widget?id={clientId}`, then sends messages to `/api/chat`
6. **Chat API** — builds a system prompt from business info and calls Claude Haiku (`claude-haiku-4-5-20251001`) at max 300 tokens

### Key files

| Path | Purpose |
|---|---|
| `app/page.js` | Landing page (server component) |
| `app/builder/page.js` | 6-step builder — all form state lives here |
| `app/api/chat/route.js` | Claude Haiku proxy with in-memory rate limiting (15 req/min per IP) |
| `app/api/widget/route.js` | Returns chatbot config JSON by `client_id` |
| `components/ChatWidget.jsx` | The embeddable chat widget |
| `components/mascots/MascotCharacter.jsx` | Industry-specific animated SVG mascots |
| `lib/chatbot-config.js` | `buildChatbotConfig()` — shapes the Supabase-stored config; `buildEmbedCode()` |
| `lib/builder-form.js` | `composeBusinessInfo()` — builds the AI system prompt context string |
| `lib/builder-validation.js` | `validateStep(step, form)` — per-step validation; returns `{ valid, errors, summary }` |
| `lib/supabase.js` | Singleton Supabase client; throws if env vars are missing |

### Supabase schema

Table `chatbots`: `client_id` (uuid, PK), `config` (jsonb). The config shape is defined by `buildChatbotConfig()` in `lib/chatbot-config.js`.

### Next.js version note

This project uses **Next.js 16.2.6**, which has breaking changes from earlier versions. Before writing any route handlers, middleware, or config changes, check `node_modules/next/dist/docs/` for the correct API.

## Git Workflow

**Commit and push to GitHub after every meaningful unit of work — no exceptions.** The user depends on this history to roll back if anything breaks. Do not batch work across multiple tasks before committing; commit as you go.

- Remote: `https://github.com/Gowan2318/chathost.git` (account: Gowan2318)
- Branch: `main`
- `gh` CLI is at `C:\Program Files\GitHub CLI` — add to PATH before use: `$env:PATH = $env:PATH + ";C:\Program Files\GitHub CLI"`
- Commit message style: imperative mood, concise subject (e.g. `Fix rate limit cleanup interval`, `Add glassmorphism chat theme`)

### When to commit

Commit after each of these — do not wait until everything is done:
- A new feature or page is added
- A bug is fixed
- A component or utility is created or meaningfully changed
- Any configuration or dependency change

### Commit sequence

```powershell
# Add to PATH if needed
$env:PATH = $env:PATH + ";C:\Program Files\GitHub CLI"

git add <specific files>
git commit -m "Short imperative description of what changed"
git push origin main
```
