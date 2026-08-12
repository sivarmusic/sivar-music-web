"use client";
import { useI18n } from "@/app/voces/components/I18n";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      className="text-[12px] font-[500] px-2.5 py-1 rounded-[6px] transition-colors duration-200"
      style={{
        background: "var(--color-bg-subtle)",
        border: "0.5px solid var(--color-border-subtle)",
        color: "var(--color-text-secondary)",
      }}
      aria-label="Toggle language"
      title="Toggle language"
    >
      {lang === "en" ? "ES" : "EN"}
    </button>
  );
}
