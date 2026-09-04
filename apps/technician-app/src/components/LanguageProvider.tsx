"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppLanguage, LANGUAGE_STORAGE_KEY, translateUiText } from "@/lib/i18n";

type Value = { language: AppLanguage; setLanguage: (language: AppLanguage) => void; t: (text: string) => string };
const Context = createContext<Value | null>(null);
const textState = new WeakMap<Text, { original: string; lastApplied: string }>();
const attrState = new WeakMap<Element, Map<string, { original: string; lastApplied: string }>>();
const ATTRS = ["placeholder", "title", "aria-label"] as const;

function preserve(original: string, translated: string) {
  return `${original.match(/^\s*/)?.[0] ?? ""}${translated}${original.match(/\s*$/)?.[0] ?? ""}`;
}
function applyText(node: Text, language: AppLanguage) {
  const parent = node.parentElement;
  if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parent.tagName)) return;
  const current = node.nodeValue ?? "";
  if (!current.trim()) return;
  let state = textState.get(node);
  if (!state) { state = { original: current, lastApplied: current }; textState.set(node, state); }
  else if (current !== state.lastApplied && current !== state.original) state.original = current;
  const normalized = state.original.trim();
  const translated = translateUiText(normalized, language);
  const next = language === "en" || translated === normalized ? state.original : preserve(state.original, translated);
  if (node.nodeValue !== next) node.nodeValue = next;
  state.lastApplied = next;
}
function applyAttrs(element: Element, language: AppLanguage) {
  let map = attrState.get(element);
  if (!map) { map = new Map(); attrState.set(element, map); }
  for (const attr of ATTRS) {
    const current = element.getAttribute(attr); if (!current) continue;
    let state = map.get(attr);
    if (!state) { state = { original: current, lastApplied: current }; map.set(attr, state); }
    else if (current !== state.lastApplied && current !== state.original) state.original = current;
    const next = language === "en" ? state.original : translateUiText(state.original, language);
    if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
    state.lastApplied = next;
  }
}
function translateTree(root: Node, language: AppLanguage) {
  if (root.nodeType === Node.TEXT_NODE) { applyText(root as Text, language); return; }
  if (![Node.ELEMENT_NODE, Node.DOCUMENT_FRAGMENT_NODE, Node.DOCUMENT_NODE].includes(root.nodeType)) return;
  if (root.nodeType === Node.ELEMENT_NODE) applyAttrs(root as Element, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) { if (node.nodeType === Node.TEXT_NODE) applyText(node as Text, language); else applyAttrs(node as Element, language); node = walker.nextNode(); }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<AppLanguage>("en");
  useEffect(() => {
    const next: AppLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "hi" ? "hi" : "en";
    setLanguageState(next); document.documentElement.lang = next;
  }, []);
  const setLanguage = useCallback((next: AppLanguage) => { setLanguageState(next); window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); document.documentElement.lang = next; }, []);
  useEffect(() => {
    const id = window.setTimeout(() => translateTree(document.body, language), 0);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => { if (mutation.type === "characterData") translateTree(mutation.target, language); mutation.addedNodes.forEach((node) => translateTree(node, language)); }));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { window.clearTimeout(id); observer.disconnect(); };
  }, [language, pathname]);
  const value = useMemo<Value>(() => ({ language, setLanguage, t: (text) => translateUiText(text, language) }), [language, setLanguage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage() { const value = useContext(Context); if (!value) throw new Error("useLanguage must be used inside LanguageProvider"); return value; }
