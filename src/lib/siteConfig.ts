// Datos de contacto de la escuela.
// TODO: reemplazar por los datos reales antes del lanzamiento (paso 51).
export const siteConfig = {
  name: 'Prados Skate',
  whatsappNumber: '573006307082', // formato internacional, sin "+"
  contactEmail: 'rubendarioing40@gmail.com',
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },
}

export const getWhatsAppUrl = (message?: string) => {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
