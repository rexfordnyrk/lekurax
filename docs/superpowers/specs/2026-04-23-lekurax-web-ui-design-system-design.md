# Lekurax Web UI — Design system & full-template visual alignment

**Status:** Approved for planning (brainstorming complete 2026-04-23).  
**Product context:** Lekurax pharmacy operations SaaS (`docs/pharmacy_system_architecture.md`).  
**Visual canon:** Marketing site `website/index.html` (Pharmaco palette, typography, mesh/glass surfaces).  
**Scope lock:** **Option A** — every route/page in the copied Wowdash-style Vite app must be brought under the design system (full template parity).  
**Brand lock:** **Option 3 (hybrid)** — **Lekurax** naming in the product shell (document title, logo lockup, primary nav labels where product-facing); **colors, type, motion, and surface patterns** match the marketing site so site and app read as one family.

---

## 1. Goals

1. **Single written design system** under `frontend/designs/system/` that engineers can implement without re-reading the static HTML.
2. **`frontend/web-ui/`** as a sibling copy of `frontend/base/app/` (Vite + React Wowdash template), visually aligned to the design system across **all** existing pages.
3. **Repository hygiene:** root-level `.gitignore` entries so `node_modules` and common frontend build artifacts are ignored for `frontend/web-ui/` and the rest of the monorepo.
4. **Execution discipline:** implementation follows a separate **writing-plans** document; execution uses **subagent-driven-development** patterns (one isolated task per subagent, spec review then quality review per task), then merge to **`dev`** when verified.

---

## 2. Non-goals

- Replacing Bootstrap 5 with Tailwind as the primary component framework in this phase (optional future phase; see risks).
- Changing backend APIs, auth flows, or pharmacy domain logic (visual and shell only unless a plan task explicitly ties to a broken UX).
- Guaranteeing **pixel-identical** parity to Tailwind CDN markup in `website/` — target is **perceptual and token-level** parity via Bootstrap + global CSS/SASS.

---

## 3. Technical approach (chosen)

**Bootstrap-first reskin with a token bridge.**

- **Stack unchanged:** React 19 + Vite + Bootstrap 5 + SASS as in `frontend/base/app/`.
- **Token source of truth:** `frontend/designs/system/` documents + CSS custom properties (and Bootstrap SCSS variable overrides where appropriate).
- **ui-ux-pro-max:** Used to generate and refine a **healthcare / pharmacy SaaS dashboard** design-system recommendation (`--design-system`), merged with **explicit extraction** from `website/index.html` (not either-or).
- **Application order:** globals → shell (sidebar/header) → shared primitives → grouped page sweeps → full-route checklist closure.

---

## 4. Marketing site extraction (canonical tokens & patterns)

These values are **normative** for color, type, motion, and surfaces unless a later ADR changes them.

### 4.1 Typography

- **Body / UI:** Noto Sans (weights 300–700).  
- **Display / headings:** Figtree (weights 300–800), with Noto Sans as fallback in stack.  
- **Loading:** Google Fonts link matching the site (`preconnect` + `css2` families as in `website/index.html`).

### 4.2 Brand color tokens (`brand.*`)

| Token | Hex | Role |
|-------|-----|------|
| `brand.primary` | `#15803D` | Primary green, key actions, emphasis |
| `brand.secondary` | `#22C55E` | Accents, highlights, secondary fills |
| `brand.cta` | `#0369A1` | Links/CTAs toward sky |
| `brand.surface` | `#F0FDF4` | Soft green-tinted surface reference |
| `brand.ink` | `#14532D` | Primary text on light surfaces |
| `brand.muted` | `#166534` | Muted text, secondary labels |

### 4.3 Page background (`mesh-bg`)

Layered radial gradients over base `#ecfdf5` (see `.mesh-bg` in `website/index.html`). Implementation in `web-ui` may use equivalent CSS in a global partial or CSS variables for gradient stops.

### 4.4 Noise overlay (`.noise`)

Fixed full-viewport `::before` pseudo-element with SVG turbulence data-URI, `pointer-events: none`, low opacity (~0.04).

### 4.5 Glass panel (`.glass-panel`)

Semi-transparent white (`rgba(255,255,255,0.72)`), mint border, soft shadow + inset highlight, `backdrop-filter: blur(16px)`.

### 4.6 Supporting patterns

- **Glow ring** (`.glow-ring`), **shine border** (`.shine-border`), **tab active** (`.tab-active`), **mini-bar** (`.mini-bar`), **marquee track** — reproduce as documented utilities or component-level styles where the React template uses equivalents.
- **Motion:** `mesh-shift`, `marquee`, `float`, `shimmer` keyframes as on the site; **always** gate decorative motion behind `prefers-reduced-motion: reduce` (site pattern: neuter duration/iteration and disable specific classes).

### 4.7 Layout chrome

- **Floating header:** inset from viewport edges (`left-3 right-3 top-3` md: `5`), glass container, `max-w-7xl`, rounded 2xl/3xl — shell should echo this **inset + glass** language even if exact pixel values adapt to dashboard layout.

---

## 5. Hybrid branding rules (Lekurax vs Pharmaco)

| Surface | Rule |
|---------|------|
| `<title>`, app shell logo text, primary “product” references | **Lekurax** |
| Color palette, fonts, mesh/glass/noise, illustration tone | **Match Pharmaco marketing site** (no separate “second palette” for the app) |
| Legal/footer strings that refer to the company site | May still say **Pharmaco** where legally or marketing-accurate; document exact strings in the implementation plan if ambiguous |
| Favicon / mark | Lekurax-oriented mark preferred; if only placeholder exists, plan task may ship lettermark consistent with shell until final brand assets exist |

---

## 6. Deliverables (filesystem)

| Path | Purpose |
|------|---------|
| `frontend/designs/system/` | **Create.** Holds the design language: at minimum `MASTER.md` (or equivalent) with tokens, components, motion, a11y, Bootstrap mapping; optional `SOURCES.md` noting ui-ux-pro-max query strings and dates. |
| `frontend/web-ui/` | **Create** as a full copy of the Vite React app currently under `frontend/base/app/` (all source, config, public assets, tests setup if present). Package identity strings updated where they surface to users or package managers (e.g. `name` in `package.json`, HTML title default). |
| Root `.gitignore` | **Create or extend** with `node_modules/`, `**/node_modules/`, `dist/`, `**/dist/`, `.vite/`, `**/.vite/`, and other standard Node/Vite ignores as needed. |
| `docs/superpowers/plans/YYYY-MM-DD-….md` | Produced by **writing-plans** after this spec is reviewed — not part of this document. |

---

## 7. ui-ux-pro-max workflow (normative for implementers)

1. From repo root, run the project skill script (path: `.cursor/skills/ui-ux-pro-max/scripts/search.py`):

   ```bash
   python3 .cursor/skills/ui-ux-pro-max/scripts/search.py \
     "healthcare pharmacy SaaS dashboard professional trustworthy green" \
     --design-system -f markdown -p "Lekurax"
   ```

2. Optionally persist hierarchical docs per skill (`--persist`, `--page "…"`) if the team wants page-level overrides later; baseline **must** land under `frontend/designs/system/`.

3. Supplemental searches (examples): `--domain ux` for accessibility/motion/z-index; `--domain chart` for dashboard chart styling; `--stack react` for React-specific performance notes.

4. **Merge rule:** ui-ux-pro-max output **supplements** but does **not override** §4 token hexes or marketing motion contracts without explicit stakeholder amendment.

---

## 8. Implementation phases (for the future plan document)

1. **Design artifacts:** Populate `frontend/designs/system/` (merged site extraction + ui-ux-pro-max).  
2. **Scaffold:** Copy `frontend/base/app/` → `frontend/web-ui/`; install; `dev` + `build` green.  
3. **Global theme:** Fonts, CSS variables, Bootstrap SCSS overrides, body background mesh + noise, base text colors.  
4. **Shell:** `MasterLayout` (and related header/sidebar) — glass/inset language + Lekurax naming.  
5. **Primitives:** Buttons, cards, tables, forms, alerts, modals, badges — map to semantic tokens.  
6. **Page sweeps:** Group routes (auth, dashboards, charts, tables, misc widgets); maintain a **route checklist** derived from the router until **100%** of routes are checked.  
7. **Verification:** `npm run build`, smoke `npm run dev`, keyboard focus and reduced-motion spot checks on representative pages per group.

---

## 9. Testing & acceptance

- **Build:** `npm run build` in `frontend/web-ui/` must succeed.  
- **Visual:** No page should retain the old default Wowdash palette where a Bootstrap-mapped token exists (exceptions documented in plan with rationale).  
- **A11y:** Focus visible on interactive controls; decorative motion respects `prefers-reduced-motion`.  
- **Brand:** Shell shows Lekurax; colors/type match §4.

---

## 10. Git workflow

- Work on a **feature branch** from `dev` unless the team standard says otherwise.  
- **Small, frequent commits** per plan task.  
- **Merge to `dev`** only after plan completion and verification (human approval).  
- Do not merge broken `build` states.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Bootstrap fights custom glass/radius | Centralize overrides; limit one-off `!important`; prefer variables + utility classes scoped under a root class (e.g. `.lekurax-theme`) |
| Page count (full parity) causes drift | Route checklist + grouped PRs/commits per plan tasks |
| ui-ux-pro-max suggests conflicting palette | §4 wins; note conflict in `MASTER.md` |
| Future Tailwind adoption | Out of scope; token doc should be portable enough to inform a later migration |

---

## 12. Open decisions deferred to implementation plan (not blockers for this spec)

- Exact `package.json` `name` string and default HTML `<title>` template.  
- Favicon asset path if not yet in repo.  
- Whether `frontend/web-ui` is a flat copy of `app/` contents vs `app/` nested the same as `frontend/base` — **default:** mirror `frontend/base/app/` file tree into `frontend/web-ui/` so paths match developer mental model (`frontend/web-ui/package.json`, etc.).

---

## 13. Approval record

- **Scope A** and **hybrid brand 3** confirmed by stakeholder.  
- **Sections 1–2** of verbal design confirmed (“yes both are correct”).  
- This file is the **authoritative design spec** for the subsequent **writing-plans** phase.
