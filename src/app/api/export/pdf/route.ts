import PDFDocument from 'pdfkit'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type ExportRow = {
  date: string
  description: string
  amount: number
  currency: string
  type: string
}

function createPdf(title: string, rows: ExportRow[]) {
  return new Promise<Buffer>((resolve) => {
    const document = new PDFDocument({ margin: 48 })
    const chunks: Buffer[] = []
    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.fontSize(22).text(title || 'Troško — izvoz transakcija')
    document
      .moveDown()
      .fontSize(10)
      .fillColor('#60708f')
      .text(`Generirano: ${new Date().toLocaleString('hr-HR')}`)
    document.moveDown().fillColor('#18223b').fontSize(11)
    if (!rows.length) document.text('Nema transakcija za odabrani izvoz.')
    else
      rows.forEach((row) =>
        document.text(
          `${row.date}  ${row.description}  ${row.type}  ${row.amount.toFixed(2)} ${row.currency}`,
        ),
      )
    document.end()
  })
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title') ?? 'Troško — izvoz transakcija'
  let rows: ExportRow[] = []
  const rawRows = request.nextUrl.searchParams.get('rows')
  if (rawRows) {
    try {
      const value = JSON.parse(rawRows)
      if (Array.isArray(value))
        rows = value.filter((row): row is ExportRow =>
          Boolean(
            row &&
            typeof row.date === 'string' &&
            typeof row.description === 'string' &&
            typeof row.amount === 'number' &&
            typeof row.currency === 'string' &&
            typeof row.type === 'string',
          ),
        )
    } catch {
      rows = []
    }
  }
  const pdf = await createPdf(title, rows)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="trosko-izvoz.pdf"',
    },
  })
}
