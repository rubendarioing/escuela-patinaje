import { useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { registerPayment, MONTHLY_FEE } from '@/services/payments.service'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RegisterPaymentDialogProps = {
  athleteId: string
  athleteName: string
  suggestedPeriodStart: string
  onSaved: () => void
  onClose: () => void
}

export function RegisterPaymentDialog({
  athleteId,
  athleteName,
  suggestedPeriodStart,
  onSaved,
  onClose,
}: RegisterPaymentDialogProps) {
  const [amount, setAmount] = useState(String(MONTHLY_FEE))
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [periodStart, setPeriodStart] = useState(suggestedPeriodStart)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)

  const handleSubmit = async () => {
    const amountNumber = Number(amount)
    if (!amountNumber || amountNumber <= 0) {
      setError('Ingresa un monto válido.')
      return
    }
    if (!paymentDate || !periodStart) {
      setError('Completa la fecha de pago y el período.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await registerPayment({ athleteId, amount: amountNumber, paymentDate, periodStart, notes })
      onSaved()
    } catch {
      setError('No se pudo registrar el pago. Puede que ya exista un pago para ese período.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar pago"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">Registrar pago</h2>
        <p className="mt-1 text-sm text-slate-600">{athleteName}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Monto
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-700">
            Fecha de pago
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-2">
            Período que cubre (inicio)
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-2">
            Notas (opcional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className={cn(buttonVariants({ variant: 'default' }), 'disabled:opacity-50')}
          >
            {isSubmitting ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
