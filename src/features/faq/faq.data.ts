export type FaqItem = {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: '¿A partir de qué edad pueden empezar?',
    answer:
      'Desde los 4 años, en el grupo de niños de 4 a 7 años y nuevos. Los mayores de 7 años tienen su propio grupo, sin edad máxima.',
  },
  {
    question: '¿Qué equipo necesito?',
    answer:
      'Patines, casco y protecciones (rodilleras, coderas y muñequeras). Si no tienes patines propios, escríbenos por WhatsApp para contarte cómo empezar.',
  },
  {
    question: '¿Puedo tomar una clase de prueba?',
    answer:
      'No hay un turno separado para clases de prueba: puedes inscribirte directamente en el horario que prefieras, o escribirnos por WhatsApp si tienes dudas antes.',
  },
  {
    question: '¿Cómo me inscribo?',
    answer:
      'Completa el formulario de inscripción con los datos del deportista y del acudiente, elige la sede y el horario, y nos pondremos en contacto para confirmar.',
  },
  {
    question: '¿Qué pasa si el horario que quiero está lleno?',
    answer:
      'El formulario te avisará que no hay cupo disponible y te sugerirá otros horarios. También puedes escribirnos por WhatsApp para buscar una alternativa.',
  },
  {
    question: '¿Cuántas sedes tienen?',
    answer:
      'Actualmente tenemos dos sedes en Zipaquirá: Prado y Colsubsidio, cada una con sus propios horarios.',
  },
]
