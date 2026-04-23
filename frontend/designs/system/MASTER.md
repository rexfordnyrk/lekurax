# Lekurax design system (MASTER)

Hybrid product **Lekurax** with **Pharmaco marketing** visual canon: greens, sky CTA, Figtree + Noto Sans, mesh background, optional glass panels. Implementation in `frontend/web-ui` uses **Wowdash compiled CSS** plus **`lekurax-tokens.css`** to remap CSS variables (`--primary-*`, `--info-*`, …).

---

## 1. Brand hybrid

| Surface | Rule |
|---------|------|
| App shell, `<title>`, logo wordmark | **Lekurax** |
| Palette, typography, mesh/noise/glass | **Pharmaco site** (`website/index.html`) |
| Company / legal footer (optional) | May reference **Pharmaco** where accurate |

---

## 2. Color tokens (canonical hex)

| Token | Hex | Use |
|-------|-----|-----|
| brand.primary | `#15803D` | Primary actions, key brand |
| brand.secondary | `#22C55E` | Accents, success highlights |
| brand.cta | `#0369A1` | Links, secondary CTAs (sky) |
| brand.surface | `#F0FDF4` | Soft surfaces |
| brand.ink | `#14532D` | Body text on light |
| brand.muted | `#166534` | Secondary text |

**Wowdash bridge:** `:root --primary-*` maps to a **green ladder**; `--info-*` maps to **sky** so template “blue primary” becomes green + CTA sky (see `src/styles/lekurax-tokens.css`).

---

## 3. Typography

- **Body / UI:** Noto Sans — `https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,300..700;1,300..700&display=swap`
- **Display / headings:** Figtree — variable 300–800 with Noto fallback
- **Loaded in:** `index.html` + `lekurax-tokens.css` `@import`

---

## 4. Surfaces

- **Mesh page background:** layered radials over `#ecfdf5` (see spec §4.3).
- **Noise:** fixed pseudo-element, ~4% opacity, SVG turbulence, `pointer-events: none`.
- **Glass panel (marketing reference):** `rgba(255,255,255,0.72)`, mint border, blur 16px — reuse for floating header / cards where Bootstrap allows without breaking layout.

---

## 5. Motion and accessibility

- Decorative motion gated with **`prefers-reduced-motion: reduce`** (global neuter in `lekurax-tokens.css`).
- Focus rings visible (3–4px); no removal of focus outlines without replacement.
- Touch targets ≥ 44px where controls are touch-first.
- Contrast: body text on light ≥ **4.5:1** vs background (prefer `brand.ink` on `#ecfdf5` / white cards).

---

## 6. Bootstrap / Wowdash variable map

| Template variable | Lekurax mapping |
|-------------------|-----------------|
| `--primary-50` … `--primary-900` | Green scale (see `lekurax-tokens.css`) |
| `--info-600` (and ladder) | Sky CTA ladder |
| `--brand`, `--button-secondary` | Derived from `--primary-600`, `--primary-50` |
| `--cyan` | `#0369a1` (align CTA) |

Do **not** edit `public/assets/css/style.css` for theme; override via loaded order + variables.

---

## 7. Component guidelines

- **Icons:** SVG (Iconify already in template); do not use emoji as icons.
- **Clickable:** `cursor-pointer` + visible hover (`transition` 150–300ms).
- **Charts (ApexCharts):** prefer palette `['#15803d','#22c55e','#0369a1', …]` for series colors when replacing hard-coded blues.

---

## 8. Anti-patterns (ui-ux-pro-max + product)

- Neon colors, motion-heavy hero loops without reduced-motion guard.
- AI-style purple/pink gradients for clinical UI.
- Gray body text lighter than `#475569` equivalent on white (low contrast).

---

## 9. Exceptions log

| Location | Reason |
|----------|--------|
| `TableDataLayer.jsx`, `InvoiceListLayer.jsx`, `DefaultTable.jsx`, `BorderedTables.jsx` | Strings like `#526534` are **fake invoice IDs**, not CSS colors. |
| `Invoice*Layer.jsx` `:#653214` style strings | Product SKU / reference formatting, not palette. |
| Neutral swatches in `ColorsLayer.jsx` | Demo of neutral scale; primary swatches updated to Lekurax green ladder. |
