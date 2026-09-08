import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { OcrService } from './ocr.service.js'
import type { OcrRequest } from './ocr.types.js'

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('parse')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf'
        callback(null, allowed)
      },
    }),
  )
  parse(
    @Body() body: OcrRequest,
    @UploadedFile() file?: Parameters<OcrService['parseReceipt']>[1],
  ) {
    return this.ocrService.parseReceipt(body, file)
  }
}
