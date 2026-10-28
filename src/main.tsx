import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (no third-party request). Only the weights/subsets we use are bundled;
// the browser downloads each subset lazily via unicode-range.
import '@fontsource-variable/inter/wght.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import './index.css'
import './i18n/config'
import App from './App.tsx'

async function bootstrap() {
  // Loaded dynamically so the mock layer is a separate chunk, not part of the app bundle.
  const { startMockApi } = await import('./mocks/browser')
  await startMockApi()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
