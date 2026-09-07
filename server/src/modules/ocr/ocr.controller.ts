import { Body, Controller, Post } from '@nestjs/common'
import { OcrService } from './ocr.service.js'
import type { OcrRequest } from './ocr.types.js'

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('parse')
  parse(@Body() body: OcrRequest) {
    return this.ocrService.parseReceipt(body)
  }
}
