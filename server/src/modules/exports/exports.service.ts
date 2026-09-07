import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

export interface ExportRow {
  date: string
  description: string
  amount: number
  currency: string
  type: string
}

@Injectable()
export class ExportsService {
  createPdf(title: string, rows: ExportRow[] = []): Promise<Buffer> {
    return new Promise((resolve) => {
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
      if (!rows.length) {
        document.text('Nema transakcija za odabrani izvoz.')
      } else {
        rows.forEach((row) =>
          document.text(
            `${row.date}  ${row.description}  ${row.type}  ${row.amount.toFixed(2)} ${row.currency}`,
          ),
        )
      }
      document.end()
    })
  }
}
