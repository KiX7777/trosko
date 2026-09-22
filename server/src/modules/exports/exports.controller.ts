import { BadRequestException, Body, Controller, Headers, HttpCode, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ExportsService } from './exports.service.js'

type PdfRequestBody = {
  dateFrom?: unknown
  dateTo?: unknown
  demo?: unknown
}

function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  )
}

function getAccessToken(authorization: string | undefined): string | undefined {
  if (!authorization) return undefined
  const [scheme, value] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    throw new BadRequestException('Neispravno Authorization zaglavlje.')
  }
  return value
}

@Controller('export')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('pdf')
  @HttpCode(200)
  async pdf(
    @Body() body: PdfRequestBody = {},
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ) {
    if (!validDate(body.dateFrom) || !validDate(body.dateTo) || body.dateFrom > body.dateTo) {
      throw new BadRequestException('Odaberite valjan raspon datuma.')
    }

    const accessToken = getAccessToken(authorization)
    const report = accessToken
      ? await this.exportsService.loadAuthenticatedReport(accessToken, body.dateFrom, body.dateTo)
      : this.exportsService.createDemoReport(body.demo, body.dateFrom, body.dateTo)
    const buffer = await this.exportsService.createPdf(report)
    const filename = `trosko-izvjestaj-${body.dateFrom}-${body.dateTo}.pdf`

    response.set({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    response.send(buffer)
  }
}
