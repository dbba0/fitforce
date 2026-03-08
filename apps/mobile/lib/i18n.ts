import { ar } from "@/lib/locales/ar";
import { de } from "@/lib/locales/de";
import { en } from "@/lib/locales/en";
import { es } from "@/lib/locales/es";
import { fr } from "@/lib/locales/fr";

export type Language = "en" | "fr" | "es" | "de" | "ar";

export const LANGUAGES: { code: Language; name: string; nativeName: string; rtl: boolean }[] = [
  { code: "en", name: "English", nativeName: "English", rtl: false },
  { code: "fr", name: "French", nativeName: "Français", rtl: false },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
];

export const translations = { en, fr, es, de, ar } as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

export function detectLanguage(localeCode: string | null): Language {
  if (!localeCode) return "en";
  const code = localeCode.toLowerCase().split("-")[0].split("_")[0];
  const map: Record<string, Language> = {
    fr: "fr",
    es: "es",
    de: "de",
    ar: "ar",
    en: "en",
  };
  return map[code] ?? "en";
}
