# Design system sources

- **Date:** 2026-04-23
- **Marketing canon:** `website/index.html` (inline Tailwind `brand.*` tokens, `.mesh-bg`, `.noise`, `.glass-panel`, motion + `prefers-reduced-motion`).
- **Architecture context:** `docs/pharmacy_system_architecture.md` (Lekurax product).

## ui-ux-pro-max (design system)

Command:

```bash
cd /home/ignis/GolandProjects/pharmaco
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py \
  "healthcare pharmacy SaaS dashboard professional trustworthy green" \
  --design-system -f markdown -p "Lekurax"
```

Output (stdout):

```
## Design System: Lekurax

### Pattern
- **Name:** Social Proof-Focused
- **CTA Placement:** Above fold
- **Sections:** Hero > Features > CTA

### Style
- **Name:** Accessible & Ethical
- **Keywords:** High contrast, large text (16px+), keyboard navigation, screen reader friendly, WCAG compliant, focus state, semantic
- **Best For:** Government, healthcare, education, inclusive products, large audience, legal compliance, public
- **Performance:** ⚡ Excellent | **Accessibility:** ✓ WCAG AAA

### Colors
| Role | Hex |
|------|-----|
| Primary | #15803D |
| Secondary | #22C55E |
| CTA | #0369A1 |
| Background | #F0FDF4 |
| Text | #14532D |

*Notes: Pharmacy green + trust blue*

### Typography
- **Heading:** Figtree
- **Body:** Noto Sans
- **Mood:** medical, clean, accessible, professional, healthcare, trustworthy
- **Best For:** Healthcare, medical clinics, pharma, health apps, accessibility
- **Google Fonts:** https://fonts.google.com/share?selection.family=Figtree:wght@300;400;500;600;700|Noto+Sans:wght@300;400;500;700
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap');
```

### Key Effects
Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Avoid (Anti-patterns)
- Bright neon colors
- Motion-heavy animations
- AI purple/pink gradients

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
```
