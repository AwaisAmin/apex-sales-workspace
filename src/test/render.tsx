import type { ReactElement, ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createQueryClient } from '@/app/queryClient'
import { Toaster } from '@/components/ui/Toast'

/** Renders with a fresh QueryClient (real retry policy, no shared cache between tests) and the toaster. */
export function renderWithProviders(ui: ReactElement) {
  const client = createQueryClient()
  // Same policy as production, minus the backoff wait.
  client.setDefaultOptions({
    ...client.getDefaultOptions(),
    queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
  return { user: userEvent.setup(), client, ...render(ui, { wrapper }) }
}
