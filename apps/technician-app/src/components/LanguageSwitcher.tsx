"use client";
import { useLanguage } from "./LanguageProvider";
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <div className="flex items-center rounded-xl border border-border-default bg-surface-2 p-1" role="group" aria-label="Language / भाषा">
    <button type="button" onClick={() => setLanguage("en")} aria-pressed={language === "en"} className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${language === "en" ? "bg-accent text-white" : "text-ink-muted"}`}>EN</button>
    <button type="button" onClick={() => setLanguage("hi")} aria-pressed={language === "hi"} className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${language === "hi" ? "bg-accent text-white" : "text-ink-muted"}`}>हिंदी</button>
  </div>;
}
