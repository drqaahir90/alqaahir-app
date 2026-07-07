import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang, LocalizedText } from "@/types";
import { dictionaries, type TranslationKey } from "./translations";

interface Ctx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  tr: (text: LocalizedText | undefined) => string;
}

const LangContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "medacad.lang";

function detectInitial(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (saved && ["en", "ar", "so"].includes(saved)) return saved;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ar")) return "ar";
  if (nav.startsWith("so")) return "so";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitial());

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const value = useMemo<Ctx>(() => ({
    lang,
    dir,
    setLang: setLangState,
    t: (key, vars) => {
      let s = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    tr: (text) => {
      if (!text) return "";
      return text[lang] || text.en || text.ar || text.so || "";
    },
  }), [lang, dir]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n() {
  const c = useContext(LangContext);
  if (!c) throw new Error("useI18n must be used inside LanguageProvider");
  return c;
}

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "so", label: "Soomaali", flag: "🇸🇴" },
];
