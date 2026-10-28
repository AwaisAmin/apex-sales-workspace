import { useEffect } from 'react'
import { AppShell } from '@/app/AppShell'
import { navigate, ROUTES, useLocation } from '@/app/router'
import { LeadsView } from '@/features/leads/LeadsView'

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname !== ROUTES.leads && pathname !== ROUTES.opportunities) navigate(ROUTES.leads, { replace: true })
  }, [pathname])

  return <AppShell>{pathname === ROUTES.opportunities ? <p>Opportunities — Step 8</p> : <LeadsView />}</AppShell>
}
