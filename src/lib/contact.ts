export function openWhatsApp(phone: string | undefined) {
  if (!phone) return
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) return
  window.open(`https://wa.me/${cleanPhone}`, '_blank')
}
