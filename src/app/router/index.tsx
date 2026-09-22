import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { HomePage } from '@/pages/public/HomePage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { RouteErrorPage } from '@/pages/public/RouteErrorPage'
import { ProgramsPage } from '@/pages/public/ProgramsPage'
import { ProgramDetailPage } from '@/pages/public/ProgramDetailPage'
import { VenuesPage } from '@/pages/public/VenuesPage'
import { VenueDetailPage } from '@/pages/public/VenueDetailPage'
import { SchedulesPage } from '@/pages/public/SchedulesPage'
import { InstructorsPage } from '@/pages/public/InstructorsPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { GalleryPage } from '@/pages/public/GalleryPage'
import { FaqPage } from '@/pages/public/FaqPage'
import { PrivacyPage } from '@/pages/public/PrivacyPage'
import { InscriptionPage } from '@/pages/public/InscriptionPage'
import { AdminAuthLayout } from '@/app/providers/AdminAuthLayout'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { LoginPage } from '@/pages/admin/LoginPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'nosotros', element: <AboutPage /> },
      { path: 'programas', element: <ProgramsPage /> },
      { path: 'programas/:slug', element: <ProgramDetailPage /> },
      { path: 'sedes', element: <VenuesPage /> },
      { path: 'sedes/:slug', element: <VenueDetailPage /> },
      { path: 'horarios', element: <SchedulesPage /> },
      { path: 'instructores', element: <InstructorsPage /> },
      { path: 'galeria', element: <GalleryPage /> },
      { path: 'preguntas-frecuentes', element: <FaqPage /> },
      { path: 'inscripcion', element: <InscriptionPage /> },
      { path: 'contacto', element: <ContactPage /> },
      { path: 'privacidad', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminAuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ index: true, element: <AdminDashboardPage /> }],
      },
    ],
  },
])
