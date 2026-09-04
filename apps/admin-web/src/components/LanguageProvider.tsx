"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppLanguage, LANGUAGE_STORAGE_KEY, translateUiText } from "@/lib/i18n";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const textState = new WeakMap<Text, { original: string; lastApplied: string }>();
const attrState = new WeakMap<Element, Map<string, { original: string; lastApplied: string }>>();
const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"] as const;

function preserveWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function applyTextNode(node: Text, language: AppLanguage) {
  const parent = node.parentElement;
  if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parent.tagName)) return;
  const current = node.nodeValue ?? "";
  if (!current.trim()) return;

  let state = textState.get(node);
  if (!state) {
    state = { original: current, lastApplied: current };
    textState.set(node, state);
  } else if (current !== state.lastApplied && current !== state.original) {
    state.original = current;
  }

  const normalized = state.original.trim();
  const translated = translateUiText(normalized, language);
  const next = language === "en" || translated === normalized ? state.original : preserveWhitespace(state.original, translated);
  if (node.nodeValue !== next) node.nodeValue = next;
  state.lastApplied = next;
}

function applyElementAttrs(element: Element, language: AppLanguage) {
  let elementMap = attrState.get(element);
  if (!elementMap) {
    elementMap = new Map();
    attrState.set(element, elementMap);
  }

  for (const attr of TRANSLATABLE_ATTRS) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    let state = elementMap.get(attr);
    if (!state) {
      state = { original: current, lastApplied: current };
      elementMap.set(attr, state);
    } else if (current !== state.lastApplied && current !== state.original) {
      state.original = current;
    }
    const translated = translateUiText(state.original, language);
    const next = language === "en" ? state.original : translated;
    if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
    state.lastApplied = next;
  }
}

function translateTree(root: Node, language: AppLanguage) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyTextNode(root as Text, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) applyElementAttrs(root as Element, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) applyTextNode(current as Text, language);
    else if (current.nodeType === Node.ELEMENT_NODE) applyElementAttrs(current as Element, language);
    current = walker.nextNode();
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const initial: AppLanguage = saved === "hi" ? "hi" : "en";
    setLanguageState(initial);
    document.documentElement.lang = initial === "hi" ? "hi" : "en";
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    document.documentElement.lang = next === "hi" ? "hi" : "en";
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => translateTree(document.body, language), 0);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target, language);
        mutation.addedNodes.forEach((node) => translateTree(node, language));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      window.clearTimeout(id);
      observer.disconnect();
    };
  }, [language, pathname]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (text: string) => translateUiText(text, language),
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
