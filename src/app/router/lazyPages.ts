import { lazy } from 'react'

// Cada página pública y administrativa se carga en su propio bloque,
// bajo demanda, en vez de venir todas juntas en un solo archivo (paso 48).
export const HomePage = lazy(() =>
  import('@/pages/public/HomePage').then((m) => ({ default: m.HomePage })),
)
export const NotFoundPage = lazy(() =>
  import('@/pages/public/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
export const ProgramsPage = lazy(() =>
  import('@/pages/public/ProgramsPage').then((m) => ({ default: m.ProgramsPage })),
)
export const ProgramDetailPage = lazy(() =>
  import('@/pages/public/ProgramDetailPage').then((m) => ({ default: m.ProgramDetailPage })),
)
export const VenuesPage = lazy(() =>
  import('@/pages/public/VenuesPage').then((m) => ({ default: m.VenuesPage })),
)
export const VenueDetailPage = lazy(() =>
  import('@/pages/public/VenueDetailPage').then((m) => ({ default: m.VenueDetailPage })),
)
export const SchedulesPage = lazy(() =>
  import('@/pages/public/SchedulesPage').then((m) => ({ default: m.SchedulesPage })),
)
export const InstructorsPage = lazy(() =>
  import('@/pages/public/InstructorsPage').then((m) => ({ default: m.InstructorsPage })),
)
export const AboutPage = lazy(() =>
  import('@/pages/public/AboutPage').then((m) => ({ default: m.AboutPage })),
)
export const ContactPage = lazy(() =>
  import('@/pages/public/ContactPage').then((m) => ({ default: m.ContactPage })),
)
export const GalleryPage = lazy(() =>
  import('@/pages/public/GalleryPage').then((m) => ({ default: m.GalleryPage })),
)
export const FaqPage = lazy(() =>
  import('@/pages/public/FaqPage').then((m) => ({ default: m.FaqPage })),
)
export const PrivacyPage = lazy(() =>
  import('@/pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
export const InscriptionPage = lazy(() =>
  import('@/pages/public/InscriptionPage').then((m) => ({ default: m.InscriptionPage })),
)

export const LoginPage = lazy(() =>
  import('@/pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })),
)
export const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
export const VenuesListPage = lazy(() =>
  import('@/pages/admin/venues/VenuesListPage').then((m) => ({ default: m.VenuesListPage })),
)
export const VenueFormPage = lazy(() =>
  import('@/pages/admin/venues/VenueFormPage').then((m) => ({ default: m.VenueFormPage })),
)
export const ProgramsListPage = lazy(() =>
  import('@/pages/admin/programs/ProgramsListPage').then((m) => ({ default: m.ProgramsListPage })),
)
export const ProgramFormPage = lazy(() =>
  import('@/pages/admin/programs/ProgramFormPage').then((m) => ({ default: m.ProgramFormPage })),
)
export const InstructorsListPage = lazy(() =>
  import('@/pages/admin/instructors/InstructorsListPage').then((m) => ({
    default: m.InstructorsListPage,
  })),
)
export const InstructorFormPage = lazy(() =>
  import('@/pages/admin/instructors/InstructorFormPage').then((m) => ({
    default: m.InstructorFormPage,
  })),
)
export const SchedulesListPage = lazy(() =>
  import('@/pages/admin/schedules/SchedulesListPage').then((m) => ({
    default: m.SchedulesListPage,
  })),
)
export const ScheduleFormPage = lazy(() =>
  import('@/pages/admin/schedules/ScheduleFormPage').then((m) => ({ default: m.ScheduleFormPage })),
)
export const AthletesListPage = lazy(() =>
  import('@/pages/admin/athletes/AthletesListPage').then((m) => ({ default: m.AthletesListPage })),
)
export const AthleteFormPage = lazy(() =>
  import('@/pages/admin/athletes/AthleteFormPage').then((m) => ({ default: m.AthleteFormPage })),
)
export const AthleteDetailPage = lazy(() =>
  import('@/pages/admin/athletes/AthleteDetailPage').then((m) => ({
    default: m.AthleteDetailPage,
  })),
)
export const GuardiansListPage = lazy(() =>
  import('@/pages/admin/guardians/GuardiansListPage').then((m) => ({
    default: m.GuardiansListPage,
  })),
)
export const GuardianFormPage = lazy(() =>
  import('@/pages/admin/guardians/GuardianFormPage').then((m) => ({ default: m.GuardianFormPage })),
)
export const RegistrationsListPage = lazy(() =>
  import('@/pages/admin/registrations/RegistrationsListPage').then((m) => ({
    default: m.RegistrationsListPage,
  })),
)
