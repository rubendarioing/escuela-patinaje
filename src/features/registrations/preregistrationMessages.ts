export const PREREGISTRATION_ERROR_MESSAGES: Record<string, string> = {
  validation_error: 'Revisa los datos ingresados e inténtalo de nuevo.',
  consent_required: 'Debes aceptar el tratamiento de datos para continuar.',
  schedule_not_found: 'Ese horario ya no está disponible. Elige otro.',
  schedule_full: 'Ese horario ya no tiene cupo. Elige otro horario o escríbenos por WhatsApp.',
  duplicate_registration: 'Ya existe una inscripción para este deportista en este horario.',
  rate_limited:
    'Has enviado varias solicitudes recientemente. Intenta más tarde o escríbenos por WhatsApp.',
}

export const getPreregistrationErrorMessage = (code?: string): string =>
  (code && PREREGISTRATION_ERROR_MESSAGES[code]) ||
  'No se pudo enviar la inscripción. Inténtalo de nuevo.'
