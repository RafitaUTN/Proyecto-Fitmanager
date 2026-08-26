/**
 * Utilidad frontend query-client.
 *
 * @remarks Centraliza lógica compartida por páginas, hooks o componentes del cliente web.
 */
import { QueryClient } from '@tanstack/react-query'
import { CachePolicy } from './cache-policy'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CachePolicy.volatile,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
