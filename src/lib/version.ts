// App version + check-for-update mock data. Single source of truth shared by the Me tab
// (version row hint), the tab bar (red dot), and AboutScreen. Pure data — no React/store deps.
export const CURRENT_VERSION: string = '1.0.0'
export const LATEST_VERSION: string = '1.1.0'
export const RELEASE_DATE = '2026-06-12'

// i18n keys for the "what's new" bullets, so the changelog stays bilingual.
export const CHANGELOG_KEYS = [
  'about.changelog.1',
  'about.changelog.2',
  'about.changelog.3',
  'about.changelog.4',
] as const

// Mock: a newer version is always available (the update never actually installs in-app —
// the CTA hands off to the App Store), so the demo is infinitely repeatable.
export const updateAvailable = LATEST_VERSION !== CURRENT_VERSION
