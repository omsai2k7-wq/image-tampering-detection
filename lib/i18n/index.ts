import { en } from "./en"

export type I18nDictionary = typeof en

export const dictionaries: Record<string, I18nDictionary> = {
  en,
}

export function getDictionary(locale = "en"): I18nDictionary {
  return dictionaries[locale] || en
}

export { en }
