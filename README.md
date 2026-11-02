# Prologue

Prologue (Project Log Gue) is a dashboard where developers keep track of their projects: where the code lives,
where it runs, which Version is out, and what work is left on the Board.

Vite + React + TypeScript SPA on Supabase (Postgres, Auth, Realtime), deployed to Vercel.

## Quick start

1. Create a Supabase project and run the files in `supabase/migrations/` in order (`…_init.sql`, `…_single_repository.sql`, `…_project_status_active_inactive.sql`) in its SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the Project URL and anon key.
3. `npm install && npm run dev`

Full setup (Auth settings, SMTP, Vercel deploy, smoke test): [`docs/SETUP.md`](docs/SETUP.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | Serve the production build locally |

## Where things are

| Path | |
|---|---|
| `GLOSSARY.md` | Domain vocabulary. Use these words in code and UI. |
| `docs/adr/` | Architecture decisions. |
| `supabase/migrations/` | Schema, RLS, triggers, RPCs, views. The source of truth for data and permissions; run in the SQL Editor. |
| `src/auth/` | Session provider, guards, login / register / password reset. |
| `src/features/dashboard/` | Dashboard overview (KPIs, charts), Project cards (from the `project_cards` view), pins, New Project. |
| `src/features/projects/` | `/projects`: every Project card, status tabs, search. |
| `src/features/invitations/` | Header bell with realtime, accept / decline. |
| `src/features/project/` | Project detail: header, the Repository → Environments → URLs, Releases, Quick Links, Members, invite. |
| `src/features/board/` | Board: Columns, Tasks, Labels, drag and drop with fractional positions, realtime. |
| `src/components/ui/` | **shadcn/ui** (Radix, style `new-york`, see `components.json`). Add more with `npx shadcn@latest add <name>`. Local changes: Button `loading`, Badge `soft` / `destructive-soft`, Progress `indicatorClassName`, flat Card. Re-adding a component with `--overwrite` drops these. |
| `src/components/` | App compositions on shadcn: `FormDialog`, `ConfirmDialog`, `Field` (TextField / TextAreaField / SelectField / FormError), `DatePicker`, `Segmented`, `StatusGlyph` (the ink state glyphs), `TagInput`, `Markdown`, domain badges, `Avatar`. |
| `src/index.css` | The e-ink paper theme from `DESIGN.md` on shadcn tokens: warm paper + near-black ink, hairlines, zero shadows, IBM Plex Sans/Mono, light and dark paper, utilities `data` (mono tabular), `micro` (uppercase label), `grain` (hero texture). |
| `src/theme/` | Theme provider (light paper / dark paper / system, saved in `localStorage`) and the Appearance menu. |

## Conventions

- Design language: `DESIGN.md` (e-ink paper). Monochrome ink only; states are `StatusGlyph`s, never colour; signal red (`destructive`) is reserved for failures such as overdue Tasks and errors. All data (versions, branches, counts, dates, URLs) in `data` (IBM Plex Mono); one solid ink button per page header.
- UI is built from shadcn/ui: reach for `src/components/ui` first, and use theme tokens (`bg-card`, `text-muted-foreground`, `text-faint` …), never raw hex.
- Toasts: `notify.error(err)` / `notify.show(msg)` from `src/lib/notify.ts` (Sonner).

- Let database triggers do their job (profiles, owner membership, default Columns and Environments,
  `last_activity_at`, unassign on leave). Don't duplicate them on the client.
- RLS-blocked updates and deletes return zero rows without an error: mutations use `.select()` and
  `expectRows()` treats an empty result as "not allowed".
- Always send `project_id` when inserting child rows.
- Never store env variables or credentials in Prologue. Link to where they live.
