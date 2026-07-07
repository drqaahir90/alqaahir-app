# QCAP · Branding Assets

Central location for every visual identity asset used by
**QCAP · Qaahir Clinical Academy**.

> ⚠️ **Placeholders only.** Every file in this folder is a text placeholder
> (`.placeholder`) that describes the required asset. Replace each with the
> real, professionally-designed file before deploying to production. Never
> commit fake or auto-generated branding.

---

## Folder structure

```
branding/
├── logo/          # Master logos (SVG + PNG variants: full, dark, light, mono, mark-only)
├── icons/         # Reusable SVG icons for use inside the app (module icons, badges…)
├── favicon/       # 16 × 16 / 32 × 32 / 48 × 48 favicon and .ico fallback
├── apple/         # iOS home-screen icons (180 × 180 apple-touch, precomposed)
├── social/        # Open Graph + Twitter card images (1200 × 630)
├── splash/        # PWA / native splash screens (see PWA_SETUP.md for size matrix)
├── screenshots/   # Store screenshots for PWA manifest + marketing (phone + tablet + desktop)
├── brand-sheet/   # 1-page PDF / PNG brand guide: colours, typography, logo usage
├── fonts/         # Licensed font files (only if not fetched from CDN — see LICENSING)
└── README.md      # This file
```

## How assets are consumed

| Slot | Source | Runtime override |
|------|--------|------------------|
| Website logo (top bar) | `public/icon.svg` → falls back to built-in `<BrandLogo>` SVG | Admin → Branding Manager |
| Favicon | `public/icon.svg` → `<link rel="icon">` | Admin → Branding Manager |
| Apple touch icon | `public/icon.svg` → `<link rel="apple-touch-icon">` | Admin → Branding Manager |
| PWA manifest icons | `public/manifest.webmanifest` → `icons[]` | (Rebuild required) |
| Splash screen colour | `manifest.webmanifest` → `background_color` | Admin → Settings → Brand colour |
| Theme colour | `manifest.webmanifest` → `theme_color` + `<meta name="theme-color">` | Admin → Settings → Brand colour |

The **Branding Manager** in the admin dashboard can override every runtime
slot without touching source code or redeploying — see
[BRANDING.md](../BRANDING.md).

## Filename conventions

Use lowercase, kebab-case, purpose-suffixed:

```
qcap-logo-full.svg
qcap-logo-full-dark.svg
qcap-logo-full-light.svg
qcap-logo-mark.svg
qcap-logo-mono.svg
qcap-icon-192.png
qcap-icon-512.png
qcap-icon-maskable-512.png
qcap-favicon.svg
qcap-favicon-32.png
qcap-apple-touch-180.png
qcap-og-1200x630.png
qcap-twitter-1200x600.png
qcap-splash-1170x2532.png     ← iPhone 12/13/14 Pro
qcap-screenshot-mobile.png
qcap-screenshot-desktop.png
qcap-brand-sheet.pdf
```

**Never** commit `Screenshot 2025-06-15 at 10.45.png` or `IMG_2938.jpg`.

## Colour palette (default)

| Token | Hex | Usage |
|-------|-----|-------|
| Brand primary | `#0d9488` | Buttons, active nav, links |
| Brand accent  | `#14b8a6` | Gradients, highlights |
| Dark surface  | `#0f172a` | Splash background, dark mode BG |
| Light surface | `#ffffff` | Light mode BG |
| Success       | `#10b981` |  |
| Warning       | `#f59e0b` |  |
| Danger        | `#ef4444` |  |

To change the palette at runtime, use **Admin → Settings → Brand colour**
(hex). See [BRANDING.md](../BRANDING.md) for CSS token overrides.

## Typography

Default: system font stack (no external dependency, best offline performance).
If you commission a custom typeface, place licensed files in `fonts/` and
document the licence in a `fonts/LICENSE` file. Do not bundle unlicensed
fonts.

## Contact

For brand-usage approval, contact **Dr. Qaahir** —
`dr.qaahir90@gmail.com`.
