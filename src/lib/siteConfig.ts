// Datos de contacto de la escuela.
// Para cambiarlos en el futuro (nuevo número o correo), edita solo estos
// dos valores y vuelve a desplegar; se usan en todo el sitio desde aquí.
export const siteConfig = {
  name: 'Prados Skate',
  whatsappNumber: '573212499482', // formato internacional, sin "+"
  contactEmail: 'rubendarioing40@gmail.com', // provisional, sin correo propio de la escuela aún
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },
}

export const getWhatsAppUrl = (message?: string) => {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
