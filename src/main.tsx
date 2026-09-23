import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { router } from '@/app/router'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { PwaUpdatePrompt } from '@/components/common/PwaUpdatePrompt'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
        <PwaUpdatePrompt />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
)
