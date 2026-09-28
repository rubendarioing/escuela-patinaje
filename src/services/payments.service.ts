import { supabase } from '@/lib/supabase'

export const MONTHLY_FEE = 40000

export type AthletePaymentStatus = {
  athleteId: string
  athleteName: string
  firstRegistrationDate: string | null
  lastPeriodStart: string | null
  lastPaymentDate: string | null
  lastAmount: number | null
  coverageEnd: string | null
  isUpToDate: boolean
}

type ActiveRegistrationRow = {
  athlete_id: string
  registration_date: string
  athletes: { id: string; first_name: string; last_name: string } | null
}

type PaymentRow = {
  id: string
  athlete_id: string
  amount: number
  payment_date: string
  period_start: string
}

// Suma un mes a una fecha 'YYYY-MM-DD' sin problemas de zona horaria
const addOneMonth = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

const todayStr = (): string => new Date().toISOString().slice(0, 10)

export const getPaymentStatusByAthlete = async (): Promise<AthletePaymentStatus[]> => {
  const [registrationsResult, paymentsResult] = await Promise.all([
    supabase
      .from('registrations')
      .select('athlete_id, registration_date, athletes ( id, first_name, last_name )')
      .in('status', ['confirmed', 'active'])
      .order('registration_date', { ascending: true }),
    supabase
      .from('payments')
      .select('id, athlete_id, amount, payment_date, period_start')
      .order('period_start', { ascending: true }),
  ])

  if (registrationsResult.error) throw registrationsResult.error
  if (paymentsResult.error) throw paymentsResult.error

  const rows = registrationsResult.data as unknown as ActiveRegistrationRow[]
  const payments = paymentsResult.data as unknown as PaymentRow[]

  // Un deportista puede tener varias inscripciones activas (varios horarios);
  // solo nos interesa su primera fecha de inscripción para sugerir el
  // período inicial de pago.
  const firstRegByAthlete = new Map<string, ActiveRegistrationRow>()
  for (const r of rows) {
    if (!firstRegByAthlete.has(r.athlete_id)) firstRegByAthlete.set(r.athlete_id, r)
  }

  // Los pagos vienen ordenados por period_start ascendente, así que el
  // último que quede en el mapa es el más reciente de cada deportista.
  const lastPaymentByAthlete = new Map<string, PaymentRow>()
  for (const p of payments) {
    lastPaymentByAthlete.set(p.athlete_id, p)
  }

  const today = todayStr()

  return Array.from(firstRegByAthlete.values()).map((r) => {
    const lastPayment = lastPaymentByAthlete.get(r.athlete_id) ?? null
    const coverageEnd = lastPayment ? addOneMonth(lastPayment.period_start) : null
    return {
      athleteId: r.athlete_id,
      athleteName: r.athletes ? `${r.athletes.first_name} ${r.athletes.last_name}` : '—',
      firstRegistrationDate: r.registration_date,
      lastPeriodStart: lastPayment?.period_start ?? null,
      lastPaymentDate: lastPayment?.payment_date ?? null,
      lastAmount: lastPayment?.amount ?? null,
      coverageEnd,
      isUpToDate: coverageEnd ? coverageEnd > today : false,
    }
  })
}

// Fecha de inicio de período sugerida para el próximo pago de este deportista
export const suggestNextPeriodStart = (status: AthletePaymentStatus): string => {
  if (status.lastPeriodStart) return addOneMonth(status.lastPeriodStart)
  return status.firstRegistrationDate ?? todayStr()
}

export const registerPayment = async (input: {
  athleteId: string
  amount: number
  paymentDate: string
  periodStart: string
  notes?: string
}): Promise<void> => {
  const { error } = await supabase.from('payments').insert({
    athlete_id: input.athleteId,
    amount: input.amount,
    payment_date: input.paymentDate,
    period_start: input.periodStart,
    notes: input.notes || null,
  })
  if (error) throw error
}
