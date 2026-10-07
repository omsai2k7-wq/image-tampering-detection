export interface Language {
  code: string
  label: string
  nativeLabel: string
  speechLang: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", label: "English", nativeLabel: "English", speechLang: "en-IN" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", speechLang: "hi-IN" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", speechLang: "te-IN" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", speechLang: "kn-IN" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", speechLang: "ta-IN" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം", speechLang: "ml-IN" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", speechLang: "bn-IN" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", speechLang: "mr-IN" },
]

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0]
