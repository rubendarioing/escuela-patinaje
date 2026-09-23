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
import { AdminLayout } from '@/components/layout/admin/AdminLayout'
import { VenuesListPage } from '@/pages/admin/venues/VenuesListPage'
import { VenueFormPage } from '@/pages/admin/venues/VenueFormPage'
import { ProgramsListPage } from '@/pages/admin/programs/ProgramsListPage'
import { ProgramFormPage } from '@/pages/admin/programs/ProgramFormPage'
import { InstructorsListPage } from '@/pages/admin/instructors/InstructorsListPage'
import { InstructorFormPage } from '@/pages/admin/instructors/InstructorFormPage'
import { SchedulesListPage } from '@/pages/admin/schedules/SchedulesListPage'
import { ScheduleFormPage } from '@/pages/admin/schedules/ScheduleFormPage'
import { AthletesListPage } from '@/pages/admin/athletes/AthletesListPage'
import { AthleteFormPage } from '@/pages/admin/athletes/AthleteFormPage'
import { AthleteDetailPage } from '@/pages/admin/athletes/AthleteDetailPage'
import { GuardiansListPage } from '@/pages/admin/guardians/GuardiansListPage'
import { GuardianFormPage } from '@/pages/admin/guardians/GuardianFormPage'

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
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'sedes', element: <VenuesListPage /> },
              { path: 'sedes/nueva', element: <VenueFormPage /> },
              { path: 'sedes/:id/editar', element: <VenueFormPage /> },
              { path: 'programas', element: <ProgramsListPage /> },
              { path: 'programas/nuevo', element: <ProgramFormPage /> },
              { path: 'programas/:id/editar', element: <ProgramFormPage /> },
              { path: 'instructores', element: <InstructorsListPage /> },
              { path: 'instructores/nuevo', element: <InstructorFormPage /> },
              { path: 'instructores/:id/editar', element: <InstructorFormPage /> },
              { path: 'horarios', element: <SchedulesListPage /> },
              { path: 'horarios/nuevo', element: <ScheduleFormPage /> },
              { path: 'horarios/:id/editar', element: <ScheduleFormPage /> },
              { path: 'deportistas', element: <AthletesListPage /> },
              { path: 'deportistas/nuevo', element: <AthleteFormPage /> },
              { path: 'deportistas/:id', element: <AthleteDetailPage /> },
              { path: 'deportistas/:id/editar', element: <AthleteFormPage /> },
              { path: 'acudientes', element: <GuardiansListPage /> },
              { path: 'acudientes/nuevo', element: <GuardianFormPage /> },
              { path: 'acudientes/:id/editar', element: <GuardianFormPage /> },
            ],
          },
        ],
      },
    ],
  },
])
