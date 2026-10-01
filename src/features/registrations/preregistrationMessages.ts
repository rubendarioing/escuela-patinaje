export const PREREGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  validation_error: 'Revisa los datos ingresados e inténtalo de nuevo.',
  consent_required: 'Debes aceptar el tratamiento de datos para continuar.',
  schedule_not_found: 'Alguno de los horarios ya no está disponible. Elige otros.',
  schedule_full:
    'Alguno de los horarios elegidos ya no tiene cupo. Elige otro o escríbenos por WhatsApp.',
  different_venues: 'Todos los horarios deben ser de la misma sede.',
  wrong_schedule_count: 'Debes elegir exactamente la cantidad de horarios que pide la sede.',
  schedule_overlap: 'Dos de los horarios elegidos se cruzan. Elige horarios en momentos distintos.',
  duplicate_registration: 'Ya existe una inscripción abierta para este deportista en esta sede.',
  rate_limited:
    'Has enviado varias solicitudes recientemente. Intenta más tarde o escríbenos por WhatsApp.',
}

export const getPreregistrationErrorMessage = (code?: string): string =>
  (code && PREREGISTRATION_ERROR_MESSAGES[code]) ||
  'No se pudo enviar la inscripción. Inténtalo de nuevo.'
