# PM OS

AI-driven IPD project management platform for hardware R&D managers — built from a real engineering-PM workflow, developed solo, and running in production.

**Production** (full-featured, China-direct): https://pm-os-prod.pages.dev
**Demo** (read-only): https://demo.pm-os.pages.dev

## What it is

A full-stack PM tool covering the entire IPD (Integrated Product Development) lifecycle — from concept review to MP. Built because the PM workflow it automates (scheduling, risk, cost, retrospective) is the workflow I ran daily as an engineering PM. Every module mirrors a real process, not a tutorial shape.

## Features

- **IPD full lifecycle** — 15 data tables: tasks, milestones, meetings, retrospectives, BOM, cost, procurement, change records, certifications, MIL, work logs, knowledge base, plus a cross-project knowledge graph
- **3-agent AI pipeline** — RiskScanner / CostAnalyzer / ScheduleDoctor run in parallel. Each receives the full project dataset and cross-project Graph context (historical records for the same supplier, material, or risk type), so analysis compares against past projects instead of staying inside one project's view
- **Graph RAG** — an LLM extracts entities and relations from meetings, retrospectives, and work logs into a knowledge graph; retrieval walks graph edges to feed the agents
- **Cloud sync engine** — Dexie table-level hooks capture every change → outbox incremental queue → debounced push to Cloudflare D1. Cross-device sync (desktop + phone), offline-first (edits while offline auto-push on reconnect), with data-loss protection: first-sync onboarding, cloud-missing detection, and a manual force-sync escape hatch
- **Client-side AI** — all 8 AI features call DeepSeek directly from the browser; the static build has no server dependency
- **China-direct production** — static export + Cloudflare Pages Functions + D1. Vercel and workers.dev are unreachable from mainland China; this stack was verified live from a mainland connection

## Tech stack

Next.js 16 (static export) · TypeScript · React 19 · Dexie.js (IndexedDB) · Cloudflare Pages + Functions + D1 · DeepSeek API · GSAP · Tailwind CSS 4

## Architecture

```
Browser (Next.js static export)
├── Dexie IndexedDB  ────────  single source of truth, offline-first
│       └── sync engine: table hooks → outbox (Dexie) → debounced push
│               │
│               ▼
│         Cloudflare D1  ────  sync_rows (tbl, id, data, updated_at)
│
└── DeepSeek API  ───────────  direct client calls (ai-remote.ts), no server
```

Pull = full snapshot (clear + bulkPut) with echo suppression; push = incremental outbox. Startup is flush-first: push pending changes, then pull.

## Deploy

- **Production**: `npm run build:prod` → `wrangler pages deploy out/ --project-name pm-os-prod` (Pages Functions included)
- **Demo**: `npm run build:demo` → `wrangler pages deploy out/ --project-name pm-os --branch demo`
- Legacy Vercel deployment retired

## Known limits

- Sync is **last-write-wins** — designed for single-user multi-device use, not concurrent editing
- The client secret is bundled in static JS — acceptable for personal use, not a multi-tenant design
- Cloud storage is a backup/sync medium (JSON rows), not a queryable database
