# PM OS

AI-driven IPD project management dashboard for hardware R&D managers.

**Demo**: [demo.pm-os.pages.dev](https://demo.pm-os.pages.dev)  
**Full**: [pm-os-eight.vercel.app](https://pm-os-eight.vercel.app)

## What it does

- **IPD full lifecycle**: 13 milestones, 9 data tables, Gantt chart, BOM, MIL tracking
- **3-agent AI pipeline**: Risk scanner, cost analyzer, and schedule health checker running in parallel — logic stays client-side, LLM handles natural language summarization only
- **Decision dashboard**: Overdue aging bar chart, on-time completion ring chart, weekly key dates timeline, project view toggle
- **Offline-first**: All data in IndexedDB (Dexie.js), works without network

## Tech stack

Next.js 16 · TypeScript · React 19 · Dexie.js · DeepSeek API · GSAP · Tailwind CSS 4

## Deploy

- **Demo** (static, China-accessible): Cloudflare Pages
- **Full** (SSR + AI APIs): Vercel
