"use client";

import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      className="flex shrink-0 items-center rounded-xl border border-border-default bg-surface-2 p-1"
      role="group"
      aria-label="Language / भाषा"
      title="Language / भाषा"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${language === "en" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
      >
        {compact ? "EN" : "English"}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        aria-pressed={language === "hi"}
        className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${language === "hi" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
      >
        हिंदी
      </button>
    </div>
  );
}
