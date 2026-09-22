import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { HomePage } from '@/pages/public/HomePage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { PlaceholderPage } from '@/pages/public/PlaceholderPage'
import { RouteErrorPage } from '@/pages/public/RouteErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'nosotros', element: <PlaceholderPage title="Nosotros" /> },
      { path: 'programas', element: <PlaceholderPage title="Programas" /> },
      { path: 'sedes', element: <PlaceholderPage title="Sedes" /> },
      { path: 'horarios', element: <PlaceholderPage title="Horarios" /> },
      { path: 'instructores', element: <PlaceholderPage title="Instructores" /> },
      { path: 'inscripcion', element: <PlaceholderPage title="Inscripción" /> },
      { path: 'contacto', element: <PlaceholderPage title="Contacto" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
