import hr from '../locales/hr.json'

type TranslationKey = keyof typeof hr
type TranslationParams = Record<string, string | number>

export function t(key: TranslationKey, params: TranslationParams = {}) {
  return hr[key].replace(/{{(\w+)}}/g, (_, name: string) => String(params[name] ?? `{{${name}}}`))
}

export const locale = 'hr-HR'
