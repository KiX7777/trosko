import { Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ExportsService, type ExportRow } from './exports.service.js'

@Controller('export')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('pdf')
  async pdf(
    @Query('title') title: string | undefined,
    @Query('rows') rows: string | undefined,
    @Res() response: Response,
  ) {
    let parsedRows: ExportRow[] = []
    if (rows) {
      try {
        parsedRows = JSON.parse(rows) as ExportRow[]
      } catch {
        parsedRows = []
      }
    }
    const buffer = await this.exportsService.createPdf(
      title ?? 'Troško — izvoz transakcija',
      parsedRows,
    )
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="trosko-izvoz.pdf"',
    })
    response.send(buffer)
  }
}
