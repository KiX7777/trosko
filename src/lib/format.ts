import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { hr } from 'date-fns/locale'

export function formatCurrency(value: number, currency = 'EUR', compact = false) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(value)
}

export function formatSignedCurrency(value: number, currency = 'EUR') {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatCurrency(value, currency)}`
}

export function formatDate(value: string) {
  return format(parseISO(value), 'dd. MMM yyyy.', { locale: hr })
}

export function formatRelativeDate(value: string) {
  const date = parseISO(value)
  if (isToday(date)) return 'Danas'
  if (isYesterday(date)) return 'Jučer'
  return formatDistanceToNow(date, { addSuffix: true, locale: hr })
}

export function formatShortDate(value: string) {
  return format(parseISO(value), 'dd. MMM', { locale: hr })
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
