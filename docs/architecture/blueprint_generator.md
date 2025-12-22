# Blueprint: AI Repository Forge (Blueprint Generator Website)

> **Goal**: A platform that empowers users to research market trends and generate "Architecture Blueprints" for high-value, AI-integrated SaaS products, creating a system of automated income.

---

## 🏗 System Architecture

### 1. The Core Flow
1.  **Input/Research**: User enters a niche (e.g., "Dental AI Marketing") or asks "Find me a profitable trend in EdTech".
2.  **Agentic Research**: System uses search APIs (Perplexity/Tavily) to analyze:
    *   Market Demand.
    *   Competitor Analysis.
    *   Feature Gap.
3.  **Blueprint Synthesis**: AI synthesizes research into the `blueprint.md` format (Architecture, Stack, Schema, Roles).
4.  **Customization**: User tweaks the blueprint via a UI form.
5.  **Repository Injection**:
    *   **Option A**: Downloads a `.zip` with the blueprint and scaffolded code.
    *   **Option B**: Direct GitHub Push to a new repo using the `repo creator` template.

### 2. High-Level Stack
*   **Frontend**: Next.js 14+ (App Router), TailwindCSS, Shadcn UI, Framer Motion (for "Premium" feel).
*   **Backend**: Next.js Server Actions (for simplicity) + Edge Functions (for long-running agents).
*   **Database**: PostgreSQL (Neon) - Storing users, generated blueprints, and trend history.
*   **AI/LLM**:
    *   **Orchestrator**: Vercel AI SDK (Core).
    *   **Models**: OpenAI GPT-4o (Reasoning & Code), Perplexity (Research).
*   **Auth**: Supabase Auth or Clerk.
*   **Payments**: Stripe (for monetization of the tool itself).

---

## 🛠 Functional Modules

### A. Trend Scout (Research Agent)
*   **Inputs**: Keywords, Target Audience, Region.
*   **Actions**:
    *   Query Search API for recent news and product launches.
    *   Analyze sentiment and "problem/solution" fit.
*   **Output**: A JSON summary of "Market Opportunity".

### B. Blueprint Engine
*   **Inputs**: Market Opportunity JSON.
*   **Prompt Strategy**:
    *   Role: "Perfectionist Software Architect".
    *   Task: Fill the `blueprint.md` template based on the opportunity.
    *   Constraint: Must pick specific, modern, stable stacks (Neon, Next.js, etc.).
*   **Output**: Valid Markdown Blueprint + SQL Schema.

### C. Repo Fabricator
*   **Mechanism**:
    *   Uses the GitHub REST API.
    *   Clones the `repo creator` template.
    *   Injects the generated `blueprint.md` into `docs/architecture/blueprint.md`.
    *   Commits to user's GitHub account.

---

## 💻 Tech Stack Specification

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Framework** | Next.js 15 (RC) | Latest features, React Server Components. |
| **Language** | TypeScript | Type safety for complex blueprint schemas. |
| **UI Library** | Shadcn UI + Magic UI | Premium, copy-paste components for speed & aesthetics. |
| **State** | Zustand | Lightweight global state for the multi-step wizard. |
| **DB / ORM** | Neon (Postgres) + Drizzle | Serverless ready, branching for dev/test flows. |
| **AI SDK** | Vercel AI SDK | Stream text/json easily to frontend. |
| **Search** | Tavily / Exa.ai | Optimized for LLM research retrieval. |
| **Hosting** | Vercel | Seamless Next.js deployment. |

---

## 📊 Database Schema (Core Tables)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  credits INT DEFAULT 3, -- Monetization logic
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  niche TEXT NOT NULL,
  content_md TEXT NOT NULL, -- The actual markdown
  schema_json JSONB NOT NULL, -- Structured data for form filling
  status TEXT DEFAULT 'draft', -- draft, generated, deployed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE market_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES blueprints(id),
  raw_data JSONB, -- Results from search API
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 Deployment Strategy

1.  **Environment**: Vercel (Pro plan recommended for timeout limits on AI functions).
2.  **Repo**: Hosted on GitHub.
3.  **CI/CD**: Standard Vercel integration (Push to main -> Deploy).

---

## 💰 Monetization Strategy (System Income)

For the *User* of this Blueprint Generator:
1.  **SaaS**: Sell access to the generator (Monthly sub).
2.  **One-Off**: Sell individual "High Value Blueprints" (e.g., "Here is a blueprint for a $10k/mo Micro-SaaS").
3.  **Affiliate**: Embed affiliate links in the generated stack recommendations (e.g., Hosting, DBs).

---

## 📝 User Flow (UX)

1.  **Home**: "Build Your Digital Empire. AI-Architected Blueprints in Seconds."
2.  **Step 1 - Discovery**: Input "I want to build a tool for [Real Estate Agents] to [automate follow-ups]."
3.  **Step 2 - Analysis (Loading)**: "Scanning market trends...", "Analyzing competitors...", "Identifying features..." (Visual progress bar).
4.  **Step 3 - Review**: "We found 3 gaps in the market. 1. No SMS integration, 2. Poor UI, 3. No Mobile App."
5.  **Step 4 - Generation**: AI writes the Blueprint.
6.  **Step 5 - Result**:
    *   **Left Panel**: interactive Blueprint preview.
    *   **Right Panel**: "Deploy Repo" button.
7.  **Step 6 - Success**: "Your repo is ready: `github.com/user/real-estate-ai-bot`. Blueprint included."

---

## 📜 Agent Guidelines (For Prompts) [OpenAI Compatible]

*   **Persona**: You are an Elite Solutions Architect and Product Manager.
*   **Tone**: Professional, visionary, precise.
*   **Constraint 1**: Always prefer "Stable" over "Hype" (e.g., recommend PostgreSQL over a niche Vector DB unless strictly necessary).
*   **Constraint 2**: Always include "Income Generation" features in the blueprint (e.g., Stripe integration, Tiered plans).

---

## 📂 Project Structure (Proposed)

```
.
├── app/
│   ├── (marketing)/      # Landing page
│   ├── (app)/dashboard/  # Generator UI
│   └── api/
│       ├── chat/         # AI Stream endpoint
│       └── research/     # Search API endpoint
├── lib/
│   ├── ai/               # Prompts & Model configs
│   └── db/               # Drizzle schema
├── components/
│   ├── blueprint/        # Markdown renderer, Schema viewer
│   └── ui/               # Shadcn components
└── public/
```
