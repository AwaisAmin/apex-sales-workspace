import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createQueryClient } from './queryClient'

export function Providers({ children }: { children: ReactNode }) {
  // One client per app instance (and per test render), never a module singleton shared across tests.
  const [client] = useState(createQueryClient)
  return (
    <QueryClientProvider client={client}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}
