# Lekurax Web UI Theming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `frontend/designs/system/` (design language + ui-ux-pro-max synthesis), clone the Vite Wowdash app to `frontend/web-ui/`, add root `.gitignore` hygiene, and apply the Lekurax / Pharmaco hybrid visual system so **every** route in `App.jsx` renders on-brand, then merge verified work to `dev`.

**Architecture:** Bootstrap-first bridge: keep compiled template CSS in `public/assets/css/` untouched; layer **`src/styles/lekurax-tokens.css`** (imported from `main.js`) to remap template CSS variables (`--primary-*`, `--info-*`, etc.) to marketing-site greens/sky, add **Figtree/Noto**, **mesh + noise** body background, **Lekurax** shell strings in `MasterLayout.jsx` and `index.html`. Sweep `src/pages/**/*.jsx` and `src/components/**/*.jsx` for **hard-coded hex** / legacy blues and replace with **semantic classes**, `var(--primary-*)`, or documented exceptions. Use **ui-ux-pro-max** at task start for each visual batch (design-system or `--domain ux`).

**Tech Stack:** React 19, Vite 6, React Router 7, Bootstrap 5 (linked from `public/`), existing Wowdash CSS, Python 3 (`ui-ux-pro-max` search script).

**Spec:** `docs/superpowers/specs/2026-04-23-lekurax-web-ui-design-system-design.md`

---

## File structure (create / modify)

| Path | Responsibility |
|------|----------------|
| `frontend/designs/system/MASTER.md` | Tokens, patterns, Bootstrap/CSS-variable map, hybrid branding, anti-patterns (ui-ux + site). |
| `frontend/designs/system/SOURCES.md` | Dated record: ui-ux-pro-max command + key stdout. |
| `frontend/designs/system/ROUTE_CHECKLIST.md` | Every `path` from `App.jsx` with checkboxes for manual visual sign-off. |
| `/.gitignore` (repo root) | `node_modules`, `dist`, Vite caches, OS junk. |
| `frontend/web-ui/**` | Full copy of `frontend/base/app/**` (excluding `node_modules`, `dist`). |
| `frontend/web-ui/package.json` | `"name": "lekurax-web-ui"` (or `lekurax-web-ui` without scope). |
| `frontend/web-ui/src/main.js` | Import `./styles/lekurax-tokens.css`; add `document.body.classList.add("lekurax-theme")` **before** `root.render`. |
| `frontend/web-ui/src/styles/lekurax-tokens.css` | **New** — fonts, `:root` variable remap, mesh/noise body, reduced-motion, dark tweaks. |
| `frontend/web-ui/index.html` | Fonts, `<title>`, meta, `theme-color` for Lekurax. |
| `frontend/web-ui/src/masterLayout/MasterLayout.jsx` | Footer, alt text, visible product name **Lekurax**. |
| `frontend/web-ui/src/pages/*.jsx` | Remove/replace hard-coded colors conflicting with tokens. |
| `frontend/web-ui/src/components/**/*.jsx` | Same. |

---

### Annex A — Route checklist source (copy into `ROUTE_CHECKLIST.md` and tick)

Unique paths from `frontend/web-ui/src/App.jsx` (after copy):  
`/`, `/index-2` … `/index-11`, `/add-user`, `/alert`, `/assign-role`, `/avatar`, `/badges`, `/button`, `/calendar-main`, `/calendar`, `/card`, `/carousel`, `/chat-empty`, `/chat-message`, `/chat-profile`, `/code-generator`, `/code-generator-new`, `/colors`, `/column-chart`, `/company`, `/currencies`, `/dropdown`, `/email`, `/faq`, `/forgot-password`, `/form-layout`, `/form-validation`, `/form`, `/gallery`, `/gallery-grid`, `/gallery-masonry`, `/gallery-hover`, `/blog`, `/blog-details`, `/add-blog`, `/testimonials`, `/coming-soon`, `/access-denied`, `/maintenance`, `/blank-page`, `/image-generator`, `/image-upload`, `/invoice-add`, `/invoice-edit`, `/invoice-list`, `/invoice-preview`, `/kanban`, `/language`, `/line-chart`, `/list`, `/marketplace-details`, `/marketplace`, `/notification-alert`, `/notification`, `/pagination`, `/payment-gateway`, `/pie-chart`, `/portfolio`, `/pricing`, `/progress`, `/radio`, `/role-access`, `/sign-in`, `/sign-up`, `/star-rating`, `/starred`, `/switch`, `/table-basic`, `/table-data`, `/tabs`, `/tags`, `/terms-condition`, `/text-generator-new`, `/text-generator`, `/theme`, `/tooltip`, `/typography`, `/users-grid`, `/users-list`, `/view-details`, `/video-generator`, `/videos`, `/view-profile`, `/voice-generator`, `/wallet`, `/widgets`, `/wizard`, plus wildcard **404** (`*`).

---

### Task 1: Design system docs (`MASTER.md`, `SOURCES.md`, `ROUTE_CHECKLIST.md`)

**Files:**
- Create: `frontend/designs/system/MASTER.md`
- Create: `frontend/designs/system/SOURCES.md`
- Create: `frontend/designs/system/ROUTE_CHECKLIST.md`
- Test: N/A (documentation)

- [ ] **Step 1: Run ui-ux-pro-max (design system)**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py \
  "healthcare pharmacy SaaS dashboard professional trustworthy green" \
  --design-system -f markdown -p "Lekurax"
```

Expected: Markdown block including Pattern, Style, Colors (Primary `#15803D`, etc.), Typography (Figtree / Noto), anti-patterns.

- [ ] **Step 2: Write `SOURCES.md`**

Create `frontend/designs/system/SOURCES.md`:

```markdown
# Design system sources

- **Date:** 2026-04-23
- **Marketing canon:** `website/index.html` (tokens in inline Tailwind config + `.mesh-bg`, `.noise`, `.glass-panel`).
- **ui-ux-pro-max:** Command as in plan Task 1 Step 1; paste full terminal output below.

[PASTE OUTPUT HERE]
```

- [ ] **Step 3: Write `MASTER.md`**

Create `frontend/designs/system/MASTER.md` with sections: **Brand hybrid**, **Color tokens**, **Typography**, **Surfaces** (mesh, noise, glass), **Motion / a11y**, **Bootstrap / Wowdash variable map** (`--primary-*` → greens, `--info-*` → sky CTA), **Component guidelines** (no emoji icons, `cursor-pointer`, focus rings, 150–300ms transitions), **Anti-patterns** (from ui-ux output: neon, motion-heavy, AI purple gradients). Include **Google Fonts** URL matching the site.

- [ ] **Step 4: Write `ROUTE_CHECKLIST.md`**

Create `frontend/designs/system/ROUTE_CHECKLIST.md`: heading + bullet list `- [ ] /path` for every path in Annex A.

- [ ] **Step 5: Commit**

```bash
git add frontend/designs/system/
git commit -m "docs(design): add Lekurax MASTER, SOURCES, and route checklist"
```

---

### Task 2: Root `.gitignore`

**Files:**
- Create or modify: `.gitignore` (repository root)

- [ ] **Step 1: If missing, create `.gitignore` with:**

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Build / Vite
dist/
**/dist/
.vite/
**/.vite/
*.local

# Logs / env
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
.env
.env.*.local

# OS / IDE
.DS_Store
Thumbs.db
.idea/
*.swp
```

- [ ] **Step 2: If `.gitignore` exists, merge** any missing entries from the block above (do not remove project-specific rules).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: root gitignore for node_modules and frontend build artifacts"
```

---

### Task 3: Clone `frontend/base/app` → `frontend/web-ui`

**Files:**
- Create: entire tree under `frontend/web-ui/` (copy from `frontend/base/app/`)

- [ ] **Step 1: Copy tree excluding heavy/ephemeral dirs**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .vite \
  frontend/base/app/ \
  frontend/web-ui/
```

Expected: `frontend/web-ui/package.json`, `frontend/web-ui/vite.config.js`, `frontend/web-ui/src/App.jsx` exist.

- [ ] **Step 2: Edit `package.json` name**

Modify: `frontend/web-ui/package.json` — set top-level field:

```json
"name": "lekurax-web-ui",
```

- [ ] **Step 3: Install and verify**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm install
npm run build
```

Expected: **exit code 0**; `frontend/web-ui/dist/` created.

- [ ] **Step 4: Commit**

```bash
git add frontend/web-ui/
git commit -m "feat(frontend): add web-ui Vite app cloned from base template"
```

---

### Task 4: Global theme layer (`lekurax-tokens.css` + `main.js`)

**Files:**
- Create: `frontend/web-ui/src/styles/lekurax-tokens.css`
- Modify: `frontend/web-ui/src/main.js`

- [ ] **Step 1: Create `lekurax-tokens.css`**

Create `frontend/web-ui/src/styles/lekurax-tokens.css` with **exactly** this content:

```css
@import url("https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..800;1,300..800&family=Noto+Sans:ital,wght@0,300..700;1,300..700&display=swap");

:root {
  --lek-brand-primary: #15803d;
  --lek-brand-secondary: #22c55e;
  --lek-brand-cta: #0369a1;
  --lek-brand-surface: #f0fdf4;
  --lek-brand-ink: #14532d;
  --lek-brand-muted: #166534;

  --primary-50: #ecfdf5;
  --primary-100: #d1fae5;
  --primary-200: #bbf7d0;
  --primary-300: #86efac;
  --primary-400: #4ade80;
  --primary-500: #22c55e;
  --primary-600: #15803d;
  --primary-700: #166534;
  --primary-800: #14532d;
  --primary-900: #052e16;
  --primary-light: rgba(21, 128, 61, 0.15);
  --primary-light-white: rgba(21, 128, 61, 0.22);

  --info-50: #f0f9ff;
  --info-100: #e0f2fe;
  --info-200: #bae6fd;
  --info-300: #7dd3fc;
  --info-400: #38bdf8;
  --info-500: #0ea5e9;
  --info-600: #0369a1;
  --info-700: #075985;
  --info-800: #0c4a6e;
  --info-900: #082f49;

  --brand: var(--primary-600);
  --button-secondary: var(--primary-50);
  --cyan: #0369a1;
  --success-main: var(--primary-600);
}

html {
  font-family: "Noto Sans", system-ui, -apple-system, sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: "Figtree", "Noto Sans", system-ui, sans-serif;
}

body.lekurax-theme {
  font-family: "Noto Sans", system-ui, -apple-system, sans-serif;
  color: var(--lek-brand-ink);
  background:
    radial-gradient(ellipse 100% 80% at 10% 0%, rgba(34, 197, 94, 0.35), transparent 55%),
    radial-gradient(ellipse 80% 60% at 90% 10%, rgba(3, 105, 161, 0.22), transparent 50%),
    radial-gradient(ellipse 60% 50% at 50% 100%, rgba(21, 128, 61, 0.2), transparent 45%),
    #ecfdf5;
}

body.lekurax-theme::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

body.lekurax-theme #root {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  body.lekurax-theme *,
  body.lekurax-theme *::before,
  body.lekurax-theme *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

[data-theme="dark"] {
  --primary-50: rgba(236, 253, 245, 0.08);
  --primary-100: rgba(209, 250, 229, 0.1);
  --primary-200: rgba(187, 247, 208, 0.12);
  --primary-600: #22c55e;
  --primary-700: #4ade80;
  --brand: var(--primary-600);
  --info-600: #38bdf8;
}
```

- [ ] **Step 2: Wire `main.js`**

Replace entire file `frontend/web-ui/src/main.js` with:

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import "react-quill-new/dist/quill.snow.css";
import "jsvectormap/dist/css/jsvectormap.css";
import "react-toastify/dist/ReactToastify.css";
import "react-modal-video/css/modal-video.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./styles/lekurax-tokens.css";
import App from "./App.jsx";

document.body.classList.add("lekurax-theme");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
```

- [ ] **Step 3: Build**

Run: `cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui && npm run build`  
Expected: **PASS** (exit 0).

- [ ] **Step 4: Commit**

```bash
git add frontend/web-ui/src/main.js frontend/web-ui/src/styles/lekurax-tokens.css
git commit -m "feat(web-ui): add Lekurax token layer and body mesh background"
```

---

### Task 5: `index.html` metadata and fonts

**Files:**
- Modify: `frontend/web-ui/index.html`

- [ ] **Step 1: Add font preconnect + stylesheet** after `<meta charset>` block (before Remixicon link):

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..800;1,300..800&family=Noto+Sans:ital,wght@0,300..700;1,300..700&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Replace meta title/description/keywords and `<title>`**

Set:

```html
    <meta name="title" content="Lekurax — Pharmacy operations platform" />
    <meta
      name="description"
      content="Lekurax — cloud pharmacy operations: inventory, prescriptions, claims, compliance, and multi-branch intelligence."
    />
    <meta name="keywords" content="Lekurax,pharmacy,dashboard,inventory,compliance" />
```

and at bottom of `<head>`:

```html
    <title>Lekurax</title>
```

- [ ] **Step 3: Set theme color**

Change `<meta name="theme-color" content="#000000" />` to:

```html
    <meta name="theme-color" content="#15803D" />
```

- [ ] **Step 4: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui && npm run build
git add frontend/web-ui/index.html
git commit -m "feat(web-ui): Lekurax HTML metadata and font preloads"
```

---

### Task 6: `MasterLayout.jsx` hybrid branding

**Files:**
- Modify: `frontend/web-ui/src/masterLayout/MasterLayout.jsx`

- [ ] **Step 1: Run ui-ux-pro-max UX pass**

Run:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "dashboard sidebar navigation accessibility focus" --domain ux -n 8
```

Use output to ensure footer/sidebar contrast and focus behavior align with recommendations.

- [ ] **Step 2: Replace footer copyright line**

Find:

```jsx
<p className='mb-0'>© 2024 WowDash. All Rights Reserved.</p>
```

Replace with:

```jsx
<p className='mb-0'>© {new Date().getFullYear()} Lekurax. All rights reserved.</p>
```

- [ ] **Step 3: Replace “Made by” attribution**

Find the fragment containing `Made by` and `wowtheme7` — replace inner content with neutral text, e.g.:

```jsx
<span className='text-secondary-light'>Pharmaco platform experience</span>
```

(Adjust outer markup minimally so JSX stays valid.)

- [ ] **Step 4: Fix `alt='Wowdash'`** (or similar) on images — set `alt='Lekurax'`.

- [ ] **Step 5: Optional text mark beside logo** — If product asks for visible wordmark: inside `.sidebar-logo` `Link`, after images, add:

```jsx
<span className="ms-2 fw-bold text-primary-600 d-none d-sm-inline">Lekurax</span>
```

- [ ] **Step 6: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui && npm run build
git add frontend/web-ui/src/masterLayout/MasterLayout.jsx
git commit -m "feat(web-ui): Lekurax shell branding in MasterLayout"
```

---

### Task 7: Sweep `src/pages` — hex / rgb hard-codes (batch 1: A–M filenames)

**Files:**
- Modify: each `frontend/web-ui/src/pages/*.jsx` whose basename matches `[A-Ma-m]*` **only if** the file contains hex/rgb hard-codes.

- [ ] **Step 1: List targets**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
rg -l "#[0-9a-fA-F]{3,8}\b|\brgba?\(" src/pages --glob '[A-Ma-m]*.jsx' || true
```

- [ ] **Step 2: For each file listed**, replace decorative hard-coded colors with:

- `var(--primary-600)`, `var(--info-600)`, `var(--lek-brand-ink)`, or Bootstrap utility classes (`text-primary-600`, `bg-primary-50`, etc.) per context.

Do **not** change colors inside **ApexCharts** `options` objects unless required for contrast; prefer chart `theme`/`colors` arrays using `['#15803d','#22c55e','#0369a1']`.

- [ ] **Step 3: Build**

Run: `npm run build` — expect **PASS**.

- [ ] **Step 4: Commit**

```bash
git add frontend/web-ui/src/pages/
git commit -m "fix(web-ui): align page hard-coded colors batch A-M (Lekurax tokens)"
```

---

### Task 8: Sweep `src/pages` — hex / rgb (batch 2: N–Z + numeric `Home*` already covered by glob)

**Files:**
- Modify: `frontend/web-ui/src/pages/*.jsx` matching `[N-Zn-z]*.jsx` per `rg` results.

- [ ] **Step 1: List**

```bash
rg -l "#[0-9a-fA-F]{3,8}\b|\brgba?\(" src/pages --glob '[N-Zn-z]*.jsx' || true
```

- [ ] **Step 2: Fix** same rules as Task 7.

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add frontend/web-ui/src/pages/
git commit -m "fix(web-ui): align page hard-coded colors batch N-Z (Lekurax tokens)"
```

---

### Task 9: Sweep `src/components` (non-child) for hard-coded colors

**Files:**
- Modify: `frontend/web-ui/src/components/*.jsx` (files directly under `components/`, not `child/`)

- [ ] **Step 1: List**

```bash
rg -l "#[0-9a-fA-F]{3,8}\b|\brgba?\(" src/components --glob '*.jsx' --glob '!child/**' || true
```

- [ ] **Step 2: Run ui-ux-pro-max stack hints**

```bash
python3 /home/ignis/GolandProjects/pharmaco/.cursor/skills/ui-ux-pro-max/scripts/search.py "forms buttons cards hover" --stack react -n 10
```

Apply relevant patterns (hover duration, focus) when touching interactive components.

- [ ] **Step 3: Fix + `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add frontend/web-ui/src/components/
git commit -m "fix(web-ui): tokenize colors in top-level components"
```

---

### Task 10: Sweep `src/components/child` — alphabetical **A–G**

**Files:**
- Modify: files returned by:

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
find src/components/child -maxdepth 1 -name '[A-Ga-g]*.jsx' | while read -r f; do rg -q "#[0-9a-fA-F]{3,8}\b|\brgba?\(" "$f" && echo "$f"; done
```

- [ ] **Step 1: Fix each printed file** (same token rules; charts → palette array).

- [ ] **Step 2: `npm run build`**

- [ ] **Step 3: Commit**

```bash
git add frontend/web-ui/src/components/child/
git commit -m "fix(web-ui): child components A-G color/token sweep"
```

---

### Task 11: Sweep `src/components/child` — **H–N**

**Files:** Same pattern with `'[H-Nh-n]*.jsx'`.

- [ ] **Step 1: find + rg loop** with `[H-Nh-n]*.jsx`

- [ ] **Step 2: Fix + build**

- [ ] **Step 3: Commit** `fix(web-ui): child components H-N color/token sweep`

---

### Task 12: Sweep `src/components/child` — **O–U**

**Files:** `'[O-Uo-u]*.jsx'`

- [ ] **Steps:** find/rg → fix → `npm run build` → commit `fix(web-ui): child components O-U color/token sweep`

---

### Task 13: Sweep `src/components/child` — **V–Z + other**

**Files:** `'[V-Zv-z]*.jsx'` plus any `*.jsx` in `child/` not starting with letter (if none, skip).

- [ ] **Steps:** find/rg → fix → build → commit `fix(web-ui): child components V-Z color/token sweep`

---

### Task 14: Residual grep + `helper/` + `masterLayout/` (excluding MasterLayout already done)

**Files:**
- Modify: `frontend/web-ui/src/helper/**/*.jsx`, `frontend/web-ui/src/masterLayout/**/*.jsx` as needed.

- [ ] **Step 1: Repo-wide residual for hex in `src`**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
rg "#[0-9a-fA-F]{6}\b" src --glob '*.jsx' || true
```

- [ ] **Step 2:** Fix any remaining matches (or document in `MASTER.md` **Exceptions** table with rationale if intentional).

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit** `fix(web-ui): residual JSX color cleanup`

---

### Task 15: Route checklist + merge readiness

**Files:**
- Modify: `frontend/designs/system/ROUTE_CHECKLIST.md` (check boxes)
- Branch: merge `feature/lekurax-web-ui` → `dev` (adjust branch name if different)

- [ ] **Step 1: Manual visual pass** — `npm run dev`, visit **every** path in `ROUTE_CHECKLIST.md`; tick checkboxes.

- [ ] **Step 2: Update checklist file** in git with `- [x]` for verified routes.

- [ ] **Step 3: Final build**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui && npm run build
```

Expected: **PASS**.

- [ ] **Step 4: Commit checklist**

```bash
git add frontend/designs/system/ROUTE_CHECKLIST.md
git commit -m "docs(design): complete route visual checklist for web-ui"
```

- [ ] **Step 5: Merge to `dev`** (after human confirms)

```bash
cd /home/ignis/GolandProjects/pharmaco
git checkout dev
git pull origin dev
git merge --no-ff feature/lekurax-web-ui -m "feat(frontend): Lekurax web-ui and design system rollout"
```

Expected: merge completes without conflicts; `frontend/web-ui` builds on clean checkout.

---

## Plan self-review

| Check | Result |
|-------|--------|
| Spec coverage | Tasks map to spec §§4–8 (tokens, web-ui, gitignore, sweeps, verification, merge). |
| Placeholders | None; commands and file paths are concrete. |
| Type/name drift | `lekurax-web-ui`, `lekurax-theme`, `lek-*` prefixes consistent. |
| Gap | Optional **Playwright**/E2E not in spec — omitted (YAGNI). Worktree note from skill: prefer `git worktree` for parallel work; optional for executor. |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-lekurax-web-ui-theming.md`. Two execution options:

**1. Subagent-driven (recommended)** — Dispatch a fresh subagent per task (Tasks 1–15), with spec compliance review then code quality review after each task, as in superpowers:subagent-driven-development.

**2. Inline execution** — Run tasks in this session using superpowers:executing-plans with checkpoints between task groups.

**Which approach do you want?**
