# QCAP · Branding Guide

How QCAP handles brand identity — what's editable at runtime, what
requires a rebuild, and how to swap in your organization's assets.

---

## Table of contents

1. [Branding surfaces](#branding-surfaces)
2. [Runtime overrides — Admin → Branding Manager](#runtime-overrides--admin--branding-manager)
3. [Rebuild-required overrides](#rebuild-required-overrides)
4. [Colour system](#colour-system)
5. [Logo usage rules](#logo-usage-rules)
6. [Typography](#typography)
7. [Asset naming conventions](#asset-naming-conventions)
8. [The `branding/` folder](#the-branding-folder)
9. [Reference: default palette](#reference-default-palette)

---

## Branding surfaces

Every place a logo, colour, or organization name appears:

| Surface | Source | Runtime editable |
|---------|--------|:----------------:|
| Top-bar brand mark | `<BrandLogo />` → custom logo OR built-in QCAP SVG | ✅ |
| Auth screen brand panel | `<BrandLogo />` | ✅ |
| Mobile drawer header | `<BrandLogo />` | ✅ |
| PWA install icon | `manifest.webmanifest` → `icons[]` | ⚠ (favicon only) |
| iOS home-screen icon | `<link rel="apple-touch-icon">` | ✅ (Admin → Branding Manager) |
| Favicon | `<link rel="icon">` | ✅ |
| Splash background colour | `manifest.webmanifest` → `background_color` | ❌ (rebuild) |
| Theme colour (Android status bar) | `<meta name="theme-color">` | ✅ (Admin → Settings → Brand colour) |
| Open Graph card | `<meta property="og:*">` in `index.html` | ❌ (rebuild) |
| App name in title bar | `<title>` in `index.html` | ❌ (rebuild) |
| Admin `siteName` display | `siteSettings.siteName` | ✅ |
| Public About Us | `aboutBlocks` + `aboutSettings` | ✅ |

---

## Runtime overrides — Admin → Branding Manager

Route: `/admin/branding`

The Branding Manager lets an administrator swap the visual identity of the
live application **without any developer involvement or redeploy**.

### Editable slots

| Slot | Notes |
|------|-------|
| **Main logo**       | Used in top bar (auto-picks the dark or light variant if provided) |
| **Dark-mode logo**  | Overrides the main logo when dark theme is active |
| **Light-mode logo** | Overrides the main logo when light theme is active |
| **App icon**        | 512 × 512 PNG — used as PWA install icon and Apple touch icon |
| **Favicon**         | 32 × 32 or SVG — updates the browser tab icon immediately |
| **SVG logo**        | Legacy field — falls back to main if unset |

### Input methods (per slot)

1. **📎 Upload file** — image is base64-encoded and stored in
   `siteSettings.branding` (no Firebase Storage cost).
2. **🌐 Paste URL** — direct link to any HTTPS image. GitHub `github.com/…/blob/…`
   URLs are auto-converted to the corresponding `raw.githubusercontent.com`
   URL.

After you paste / upload, a preview appears immediately. Click
**Apply branding** to persist. Favicon + Apple touch icon are re-injected
into the document head on the spot; logos reload on the next navigation.

---

## Rebuild-required overrides

A small set of fields are baked into the initial HTML for SEO / social /
first-paint reasons. To change them, edit the source file and redeploy.

| Field | File | Line |
|-------|------|------|
| App name in browser title | `index.html` | `<title>` element |
| PWA name | `public/manifest.webmanifest` | `"name"`, `"short_name"` |
| Splash background colour | `public/manifest.webmanifest` | `"background_color"` |
| Default theme colour | `public/manifest.webmanifest` + `index.html` | `"theme_color"` / `<meta name="theme-color">` |
| Open Graph image | `index.html` | `<meta property="og:image">` |
| App shortcuts | `public/manifest.webmanifest` | `"shortcuts"[]` |

---

## Colour system

Brand colours are exposed as CSS custom properties in `src/index.css`:

```css
:root {
  color-scheme: light;
  --brand: #14b8a6;
  --brand-dark: #0d9488;
  --bg: #f8fafc;
  --bg-2: #f1f5f9;
  --fg: #0f172a;
  --muted: #64748b;
  --card: #ffffff;
  --border: #e2e8f0;
}

.dark {
  color-scheme: dark;
  --bg: #020617;
  --bg-2: #0f172a;
  --fg: #f1f5f9;
  --muted: #94a3b8;
  --card: #0f172a;
  --border: #1e293b;
}
```

To rebrand with your organization's palette:

1. Set your primary brand hex at **Admin → Settings → Brand colour**. This
   updates `--brand` at runtime and re-colours accents across the UI.
2. For a full redesign, edit the CSS custom properties above and Tailwind
   `bg-teal-*` / `text-teal-*` utilities in the codebase.

---

## Logo usage rules

- **Clear space**: keep at least 0.5× the logo's height clear on all
  sides.
- **Minimum size**: 24 × 24 for icon-only, 96 × 24 for full wordmark.
- **Backgrounds**: use the dark-mode logo on backgrounds darker than
  #4a4a4a; use the light-mode logo otherwise.
- **Never** distort, rotate, add drop shadows, or recolour the logo
  outside the approved palette.
- **Never** use the QCAP wordmark to endorse another product without
  written permission from the owner.

Full brand guide: `branding/brand-sheet/qcap-brand-sheet.pdf` (placeholder
until the professional version is delivered).

---

## Typography

QCAP uses the **system font stack** by default:

```css
system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
"Noto Sans", "Noto Sans Arabic", sans-serif;
```

Rationale: zero external dependency, best possible offline performance,
consistent with each user's OS.

### RTL

Arabic renders with `"Noto Sans Arabic"` as the first-choice fallback. The
document `<html>` tag automatically receives `dir="rtl"` when the user
switches to Arabic.

### Custom typeface

If you commission a bespoke typeface, place licensed files in
[`branding/fonts/`](branding/fonts/) and add `@font-face` rules to
`src/index.css`.

---

## Asset naming conventions

Every asset in `branding/` and `public/` should follow:

```
<project>-<slot>-<variant>-<size>.<ext>
qcap-logo-full-dark.svg
qcap-icon-maskable-512.png
qcap-favicon-32.png
qcap-og-1200x630.png
qcap-splash-1170x2532.png
```

Rules:

- **Lowercase** only.
- **Kebab-case** (`-`), never camelCase or spaces.
- **Purpose first, variant/size last.**
- Never commit `IMG_1234.jpg` or `Screenshot 2025-06-15.png`.

---

## The `branding/` folder

See [`branding/README.md`](branding/README.md) for a full folder tour.

Summary:

```
branding/
├── logo/          # SVG + PNG master logos
├── icons/         # Reusable in-app SVG icons
├── favicon/       # Favicon set
├── apple/         # iOS touch icons
├── social/        # OG + Twitter cards
├── splash/        # PWA splash screens
├── screenshots/   # Store screenshots
├── brand-sheet/   # 1-page brand guide (PDF/PNG)
├── fonts/         # Optional custom typefaces + licenses
└── README.md
```

Every subfolder currently contains a `.placeholder` file describing the
expected assets. Replace placeholders with real files before deployment.

---

## Reference: default palette

| Token | Hex | Used in |
|-------|-----|---------|
| **Primary** — Teal 600 | `#0d9488` | Buttons, active nav, links |
| **Accent** — Teal 500 | `#14b8a6` | Gradients, highlights |
| **Dark surface** — Slate 900 | `#0f172a` | Splash background, dark mode |
| **Light surface** | `#ffffff` | Light mode |
| **Success** — Emerald 500 | `#10b981` | Positive feedback, "correct" |
| **Warning** — Amber 500 | `#f59e0b` | Cautions, "medium difficulty" |
| **Danger** — Rose 500 | `#ef4444` | Errors, "hard difficulty", moderation |
| **Muted text** — Slate 500 | `#64748b` | Secondary copy, timestamps |

Refer to Tailwind's colour scale (`bg-teal-{50-900}`, `bg-slate-{50-900}`,
etc.) for consistent shading throughout the app.

---

## Contact

For brand approval or asset requests, contact **Dr. Qaahir** —
`dr.qaahir90@gmail.com`.
