# Graph Report - .  (2026-06-14)

## Corpus Check
- 66 files · ~494,417 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 107 nodes · 41 edges · 78 communities (5 shown, 73 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Project Architecture|Project Architecture]]
- [[_COMMUNITY_Chatbot Builder UI|Chatbot Builder UI]]
- [[_COMMUNITY_Widget & Chat API|Widget & Chat API]]
- [[_COMMUNITY_Auth & Dashboard|Auth & Dashboard]]
- [[_COMMUNITY_Brand & Mascots|Brand & Mascots]]
- [[_COMMUNITY_Landing & Marketing|Landing & Marketing]]
- [[_COMMUNITY_Config & Validation|Config & Validation]]
- [[_COMMUNITY_Supabase Data Layer|Supabase Data Layer]]
- [[_COMMUNITY_Module Group 8|Module Group 8]]
- [[_COMMUNITY_Module Group 9|Module Group 9]]
- [[_COMMUNITY_Module Group 10|Module Group 10]]
- [[_COMMUNITY_Module Group 11|Module Group 11]]
- [[_COMMUNITY_Module Group 12|Module Group 12]]
- [[_COMMUNITY_Module Group 13|Module Group 13]]
- [[_COMMUNITY_Module Group 14|Module Group 14]]
- [[_COMMUNITY_Module Group 15|Module Group 15]]
- [[_COMMUNITY_Module Group 16|Module Group 16]]
- [[_COMMUNITY_Module Group 17|Module Group 17]]
- [[_COMMUNITY_Module Group 18|Module Group 18]]
- [[_COMMUNITY_Module Group 19|Module Group 19]]
- [[_COMMUNITY_Module Group 20|Module Group 20]]
- [[_COMMUNITY_Module Group 21|Module Group 21]]
- [[_COMMUNITY_Module Group 22|Module Group 22]]
- [[_COMMUNITY_Module Group 23|Module Group 23]]
- [[_COMMUNITY_Module Group 24|Module Group 24]]
- [[_COMMUNITY_Module Group 25|Module Group 25]]
- [[_COMMUNITY_Module Group 26|Module Group 26]]
- [[_COMMUNITY_Module Group 27|Module Group 27]]
- [[_COMMUNITY_Module Group 28|Module Group 28]]
- [[_COMMUNITY_Module Group 29|Module Group 29]]
- [[_COMMUNITY_Module Group 30|Module Group 30]]
- [[_COMMUNITY_Module Group 31|Module Group 31]]
- [[_COMMUNITY_Module Group 32|Module Group 32]]
- [[_COMMUNITY_Module Group 33|Module Group 33]]
- [[_COMMUNITY_Module Group 34|Module Group 34]]
- [[_COMMUNITY_Module Group 35|Module Group 35]]
- [[_COMMUNITY_Module Group 36|Module Group 36]]
- [[_COMMUNITY_Module Group 37|Module Group 37]]
- [[_COMMUNITY_Module Group 38|Module Group 38]]
- [[_COMMUNITY_Module Group 39|Module Group 39]]
- [[_COMMUNITY_Module Group 40|Module Group 40]]
- [[_COMMUNITY_Module Group 41|Module Group 41]]
- [[_COMMUNITY_Module Group 42|Module Group 42]]
- [[_COMMUNITY_Module Group 43|Module Group 43]]
- [[_COMMUNITY_Module Group 44|Module Group 44]]
- [[_COMMUNITY_Module Group 45|Module Group 45]]
- [[_COMMUNITY_Module Group 46|Module Group 46]]
- [[_COMMUNITY_Module Group 47|Module Group 47]]
- [[_COMMUNITY_Module Group 48|Module Group 48]]
- [[_COMMUNITY_Module Group 49|Module Group 49]]
- [[_COMMUNITY_Module Group 50|Module Group 50]]
- [[_COMMUNITY_Module Group 51|Module Group 51]]
- [[_COMMUNITY_Module Group 52|Module Group 52]]
- [[_COMMUNITY_Module Group 53|Module Group 53]]
- [[_COMMUNITY_Module Group 54|Module Group 54]]
- [[_COMMUNITY_Module Group 55|Module Group 55]]
- [[_COMMUNITY_Module Group 56|Module Group 56]]
- [[_COMMUNITY_Module Group 57|Module Group 57]]
- [[_COMMUNITY_Module Group 58|Module Group 58]]
- [[_COMMUNITY_Module Group 59|Module Group 59]]
- [[_COMMUNITY_Module Group 60|Module Group 60]]
- [[_COMMUNITY_Module Group 61|Module Group 61]]
- [[_COMMUNITY_Module Group 62|Module Group 62]]
- [[_COMMUNITY_Module Group 63|Module Group 63]]
- [[_COMMUNITY_Module Group 64|Module Group 64]]
- [[_COMMUNITY_Module Group 65|Module Group 65]]
- [[_COMMUNITY_Module Group 66|Module Group 66]]
- [[_COMMUNITY_Module Group 67|Module Group 67]]
- [[_COMMUNITY_Module Group 68|Module Group 68]]
- [[_COMMUNITY_Module Group 69|Module Group 69]]
- [[_COMMUNITY_Module Group 70|Module Group 70]]
- [[_COMMUNITY_Module Group 71|Module Group 71]]
- [[_COMMUNITY_Module Group 72|Module Group 72]]
- [[_COMMUNITY_Module Group 73|Module Group 73]]
- [[_COMMUNITY_Module Group 74|Module Group 74]]
- [[_COMMUNITY_Module Group 75|Module Group 75]]
- [[_COMMUNITY_Module Group 76|Module Group 76]]
- [[_COMMUNITY_Module Group 77|Module Group 77]]

## God Nodes (most connected - your core abstractions)
1. `VestaChatHost Project` - 10 edges
2. `Industry Mascot Set — Kawaii Brand Characters` - 10 edges
3. `6-Step Chatbot Builder Flow` - 5 edges
4. `Supabase chatbots Table` - 4 edges
5. `Embeddable Widget Runtime` - 4 edges
6. `Chat API (Claude Haiku Proxy)` - 4 edges
7. `Environment Variables (ANTHROPIC_API_KEY, Supabase)` - 3 edges
8. `app/api/chat/route.js — Claude Haiku Proxy` - 3 edges
9. `README — Next.js Bootstrapped Project Docs` - 3 edges
10. `Stripe Checkout Integration` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Wordmark SVG Logo` --references--> `README — Next.js Bootstrapped Project Docs`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG — Triangle Mark` --references--> `README — Next.js Bootstrapped Project Docs`  [INFERRED]
  public/vercel.svg → README.md
- `Industry Mascot Set — Kawaii Brand Characters` --references--> `Barber Shop Mascot — Kawaii Barber Pole`  [EXTRACTED]
  CLAUDE.md → public/mascots/barber.png
- `Industry Mascot Set — Kawaii Brand Characters` --references--> `Dental Mascot — Kawaii Smiling Tooth`  [EXTRACTED]
  CLAUDE.md → public/mascots/dental.png
- `Industry Mascot Set — Kawaii Brand Characters` --references--> `Gym Mascot — Kawaii Dumbbell`  [EXTRACTED]
  CLAUDE.md → public/mascots/gym.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **VestaChatHost End-to-End Data Flow** — chathost_claude_builder_flow, chathost_claude_stripe_checkout, chathost_claude_supabase_chatbots_table, chathost_claude_widget_runtime, chathost_claude_api_widget_route, chathost_claude_api_chat_route, chathost_claude_claude_haiku_model [EXTRACTED 1.00]
- **Industry Mascot Character Set (Kawaii Style)** — mascots_barber_mascot_character, mascots_dental_mascot_character, mascots_gym_mascot_character, mascots_law_mascot_character, mascots_lawncare_mascot_character, mascots_other_mascot_character, mascots_realestate_mascot_character, mascots_restaurant_mascot_character, mascots_salon_mascot_character [EXTRACTED 1.00]
- **Core Business Logic Libraries** — chathost_claude_lib_chatbot_config, chathost_claude_lib_builder_form, chathost_claude_lib_builder_validation, chathost_claude_lib_supabase [EXTRACTED 1.00]
- **Next.js Breaking Change Guards** — chathost_agents_nextjs_warning, chathost_claude_nextjs_version_rationale [EXTRACTED 1.00]

## Communities (78 total, 73 thin omitted)

### Community 0 - "Project Architecture"
Cohesion: 0.20
Nodes (11): components/mascots/MascotCharacter.jsx — Animated SVG Mascots, Industry Mascot Set — Kawaii Brand Characters, Barber Shop Mascot — Kawaii Barber Pole, Dental Mascot — Kawaii Smiling Tooth, Gym Mascot — Kawaii Dumbbell, Law Mascot — Kawaii Golden Scales of Justice, Lawn Care Mascot — Kawaii Green Leaf, Other Industry Mascot — Kawaii Robot Bot (+3 more)

### Community 1 - "Chatbot Builder UI"
Cohesion: 0.31
Nodes (9): app/page.js — Landing Page, Chat API (Claude Haiku Proxy), Claude Haiku Model (claude-haiku-4-5-20251001), Environment Variables (ANTHROPIC_API_KEY, Supabase), Git Commit-Per-Feature Workflow, lib/supabase.js — Singleton Supabase Client, VestaChatHost Project, Stripe Checkout Integration (+1 more)

### Community 2 - "Widget & Chat API"
Cohesion: 0.40
Nodes (5): app/api/chat/route.js — Claude Haiku Proxy, app/api/widget/route.js — Config Endpoint, components/ChatWidget.jsx — Embeddable Chat Widget, In-Memory Rate Limiting Rationale (15 req/min per IP), Embeddable Widget Runtime

### Community 3 - "Auth & Dashboard"
Cohesion: 0.40
Nodes (5): app/builder/page.js — Builder Page, 6-Step Chatbot Builder Flow, lib/builder-form.js — composeBusinessInfo, lib/builder-validation.js — validateStep, lib/chatbot-config.js — buildChatbotConfig & buildEmbedCode

### Community 4 - "Brand & Mascots"
Cohesion: 0.67
Nodes (3): README — Next.js Bootstrapped Project Docs, Next.js Wordmark SVG Logo, Vercel Logo SVG — Triangle Mark

## Knowledge Gaps
- **87 isolated node(s):** `OPTIONS`, `POST`, `GET`, `BuilderPage`, `ComingSoonPage` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `VestaChatHost Project` connect `Chatbot Builder UI` to `Widget & Chat API`, `Auth & Dashboard`, `Brand & Mascots`, `Landing & Marketing`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `Embeddable Widget Runtime` connect `Widget & Chat API` to `Chatbot Builder UI`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `OPTIONS`, `POST`, `GET` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._