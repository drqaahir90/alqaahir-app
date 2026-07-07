/**
 * PWA setup.
 *
 * Priority:
 *   1. Prefer the real `manifest.webmanifest`, `icon.svg` and `sw.js` files
 *      shipped in `public/`. These give proper Chrome/Android installability
 *      (icons, splash screen, Google-compliant manifest, offline support).
 *   2. If for any reason those files are unreachable (e.g. served over
 *      file:// during preview), fall back to inline data-URL manifest/icon.
 */

interface PwaOptions {
  name?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  icon?: string;
}

const SVG_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#0f766e"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <path d="M256 108c-70 0-124 54-124 122 0 70 62 112 124 176 62-64 124-106 124-176 0-68-54-122-124-122z" fill="#fff" opacity=".92"/>
  <path d="M188 244h44v-44h48v44h44v48h-44v44h-48v-44h-44z" fill="#0f766e"/>
</svg>`.trim();

function svgDataUrl(svg: string) {
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

function ensureMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function ensureLink(rel: string, href: string, extra: Record<string, string> = {}) {
  const query = extra.sizes ? `link[rel="${rel}"][sizes="${extra.sizes}"]` : `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(query);
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
  return el;
}

async function urlExists(url: string): Promise<boolean> {
  if (typeof fetch === "undefined") return false;
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-cache" });
    return r.ok;
  } catch { return false; }
}

export async function setupPWA(opts: PwaOptions = {}) {
  const name = opts.name || "MedAcademy";
  const shortName = opts.shortName || "MedAcademy";
  const theme = opts.themeColor || "#0d9488";
  const bg = opts.backgroundColor || "#0f172a";

  // Standard PWA / iOS meta tags
  ensureMeta("theme-color", theme);
  ensureMeta("mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  ensureMeta("apple-mobile-web-app-title", shortName);
  ensureMeta("application-name", name);
  ensureMeta("format-detection", "telephone=no");

  // Prefer real files (better for Google Play / installability)
  const manifestPath = new URL("manifest.webmanifest", location.href).href;
  const iconPath = new URL("icon.svg", location.href).href;
  const swPath = new URL("sw.js", location.href).href;

  const [hasManifest, hasIcon] = await Promise.all([urlExists(manifestPath), urlExists(iconPath)]);

  if (hasManifest) {
    ensureLink("manifest", manifestPath);
  } else {
    // Fallback: inline manifest as data URL
    const manifest = {
      name, short_name: shortName,
      description: "Multilingual medical academic platform — MCQs, cases, and OPD simulator.",
      start_url: ".", scope: ".",
      display: "standalone",
      orientation: "portrait",
      background_color: bg, theme_color: theme,
      lang: document.documentElement.lang || "en",
      dir: document.documentElement.dir || "ltr",
      icons: [
        { src: opts.icon || svgDataUrl(SVG_ICON), sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
      ],
      categories: ["education", "medical", "productivity"],
    };
    const manifestUrl = "data:application/manifest+json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest));
    ensureLink("manifest", manifestUrl);
  }

  const iconFinal = hasIcon ? iconPath : (opts.icon || svgDataUrl(SVG_ICON));
  ensureLink("icon", iconFinal, { type: iconFinal.endsWith(".svg") || iconFinal.startsWith("data:image/svg") ? "image/svg+xml" : "image/png" });
  ensureLink("apple-touch-icon", iconFinal);

  // Service worker — only if a real one is present at the origin.
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    try {
      if (await urlExists(swPath)) {
        const reg = await navigator.serviceWorker.register(swPath, { scope: "./" });
        // Auto-activate updates without forcing a reload loop.
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              // A new SW is ready — tell it to skip waiting so next navigation uses it.
              try { nw.postMessage({ type: "SKIP_WAITING" }); } catch { /* ignore */ }
            }
          });
        });
      }
    } catch { /* SW registration failure is non-fatal */ }
  }
}

/** Runtime helper for the Branding Manager. */
export function updateBrandingAssets(opts: {
  favicon?: string; appIcon?: string; themeColor?: string;
}) {
  if (opts.favicon) ensureLink("icon", opts.favicon);
  if (opts.appIcon) ensureLink("apple-touch-icon", opts.appIcon);
  if (opts.themeColor) ensureMeta("theme-color", opts.themeColor);
}
