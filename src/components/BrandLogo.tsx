import { useEffect, useState } from "react";
import { dbService } from "@/services/db";
import { useTheme } from "@/theme";
import type { BrandingAssets, SiteSettings } from "@/types";
import { cn } from "@/utils/cn";

/**
 * Renders the brand mark. Priority:
 *   1. Custom uploaded logo (theme-aware: dark/light logo, otherwise mainLogo)
 *   2. Legacy `websiteLogo` field
 *   3. Built-in "QCAP" monogram (SVG)
 *
 * Reactively refreshes when settings change (via subscribe).
 */
export function BrandLogo({
  className,
  size = 36,
  showText = true,
  variant = "auto",
}: {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: "auto" | "icon" | "wordmark";
}) {
  const [branding, setBranding] = useState<BrandingAssets | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    // Cached settings won't hit Firestore again — safe & cheap.
    let cancelled = false;
    (async () => {
      const s = await dbService.getSettings();
      if (!cancelled) setBranding(s.branding || null);
    })();
    // React to settings changes without hammering Firestore
    const unsub = dbService.subscribe<SiteSettings & { id: string }>("siteSettings", (docs) => {
      const main = docs.find((d) => d.id === "main");
      if (main) setBranding(main.branding || null);
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  const custom = branding
    ? (resolved === "dark" && branding.darkLogo) ||
      (resolved === "light" && branding.lightLogo) ||
      branding.mainLogo ||
      branding.websiteLogo ||
      branding.svgLogo ||
      undefined
    : undefined;

  if (custom) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <img src={custom} alt="QCAP" style={{ height: size, width: "auto", maxWidth: size * 5 }}
             className="object-contain"
             onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      </div>
    );
  }

  // Fallback built-in mark
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <QCAPMark size={size} />
      {showText && variant !== "icon" && (
        <span className="font-extrabold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline"
              style={{ fontSize: Math.round(size * 0.5) }}>
          QCAP
        </span>
      )}
    </div>
  );
}

export function QCAPMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="qcap-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#qcap-g)" />
      <text x="32" y="42" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight="800" fontSize="24" fill="#fff" letterSpacing="0.5">
        Q
      </text>
      <circle cx="47" cy="47" r="6" fill="#fff" opacity="0.9" />
      <path d="M44 47h6M47 44v6" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
