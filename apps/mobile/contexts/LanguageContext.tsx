import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";
import { Language, LANGUAGES, translations, TranslationKey, detectLanguage } from "@/lib/i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "@fitforce_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && translations[stored as Language]) {
          setLanguageState(stored as Language);
        } else {
          const locales = Localization.getLocales();
          const locale = locales?.[0]?.languageCode ?? null;
          const detected = detectLanguage(locale);
          setLanguageState(detected);
        }
      } catch {
        setLanguageState("en");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    const langInfo = LANGUAGES.find((l) => l.code === lang);
    if (langInfo) {
      I18nManager.forceRTL(langInfo.rtl);
    }
  };

  const isRTL = useMemo(() => {
    const langInfo = LANGUAGES.find((l) => l.code === language);
    return langInfo?.rtl ?? false;
  }, [language]);

  const translate = useMemo(() => {
    return (key: TranslationKey): string => {
      return translations[language]?.[key] ?? translations.en[key] ?? key;
    };
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: translate,
    isRTL,
    languages: LANGUAGES,
  }), [language, translate, isRTL]);

  if (!loaded) return null;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
