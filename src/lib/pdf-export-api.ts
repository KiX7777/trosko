import { supabase, supabaseEnabled } from './supabase'

type PdfExportInput = {
  dateFrom: string
  dateTo: string
  demo?: unknown
}

function filenameFromDisposition(value: string | null, fallback: string): string {
  const match = value?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? fallback
}

export async function downloadPdfReport({ dateFrom, dateTo, demo }: PdfExportInput): Promise<void> {
  let accessToken: string | undefined
  if (supabase) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    accessToken = data.session?.access_token
  }

  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      dateFrom,
      dateTo,
      ...(supabaseEnabled ? {} : { demo }),
    }),
  })

  if (!response.ok) {
    const message = await response
      .json()
      .then((body: { message?: string | string[] }) =>
        Array.isArray(body.message) ? body.message.join(' ') : body.message,
      )
      .catch(() => undefined)
    throw new Error(message || 'PDF izvještaj nije moguće izraditi.')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filenameFromDisposition(
    response.headers.get('content-disposition'),
    `trosko-izvjestaj-${dateFrom}-${dateTo}.pdf`,
  )
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
