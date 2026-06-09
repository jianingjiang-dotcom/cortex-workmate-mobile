import { useStore } from '../store/useStore'
import { translate } from './strings'
import type { Lang } from '../lib/types'

export type TFn = (key: string, vars?: Record<string, string | number>) => string

/** Hook returning a reactive `t()` bound to the current language. */
export function useT(): TFn {
  const lang = useStore((s) => s.lang)
  return (key, vars) => translate(lang, key, vars)
}

export function useLang(): Lang {
  return useStore((s) => s.lang)
}

export { translate }
