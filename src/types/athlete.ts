export type Athlete = {
  id: string
  firstName: string
  lastName: string
  documentType: string | null
  documentNumber: string | null
  birthDate: string
  gender: string | null
  bloodType: string | null
  notes: string | null
  status: 'prospect' | 'active' | 'inactive' | 'withdrawn'
  source: 'admin' | 'web_form'
  createdAt: string
}
