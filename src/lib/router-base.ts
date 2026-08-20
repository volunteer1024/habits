export function routerBasename(baseUrl = import.meta.env.BASE_URL): string {
  if (!baseUrl || baseUrl === '/') return '/'
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}
