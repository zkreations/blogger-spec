export const CATALOG_NAMES = [
  'directives',
  'operators',
  'types',
  'widgets',
  'settings',
  'globals',
  'messages',
  'scopes',
  'diagnostics',
  'inclusions',
  'locales',
] as const

export type BloggerCatalogNameConstant = typeof CATALOG_NAMES[number]
