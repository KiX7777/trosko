import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createWorker, type Worker } from 'tesseract.js'
import { parseReceiptText } from './ocr-parser.js'
import type { OcrRequest, OcrResult } from './ocr.types.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_PDF_PAGES = 10

type UploadedFile = {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

const canvasGlobals = { DOMMatrix, ImageData, Path2D }
for (const [name, value] of Object.entries(canvasGlobals)) {
  if (!(name in globalThis)) Object.assign(globalThis, { [name]: value })
}

@Injectable()
export class OcrService implements OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name)
  private workerPromise?: Promise<Worker>

  async parseReceipt(input: OcrRequest = {}, file?: UploadedFile): Promise<OcrResult> {
    const sourceFile = file?.originalname ?? input.fileName
    try {
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          return this.failed(
            sourceFile,
            'Datoteka je prevelika. Najveća dopuštena veličina je 10 MB.',
          )
        }
        const text = await this.extractTextFromFile(file)
        return parseReceiptText(text.text, sourceFile, text.confidence)
      }

      if (input.text?.trim()) return parseReceiptText(input.text, sourceFile)
      return this.failed(sourceFile, 'Nije poslana datoteka niti tekst za OCR obradu.')
    } catch (error) {
      this.logger.error(`OCR failed for ${sourceFile ?? 'unknown file'}`, error)
      return this.failed(
        sourceFile,
        'OCR obrada nije uspjela. Pokušaj ponovno ili provjeri račun ručno.',
      )
    }
  }

  async onModuleDestroy() {
    const worker = await this.workerPromise?.catch(() => undefined)
    await worker?.terminate()
  }

  private async extractTextFromFile(
    file: UploadedFile,
  ): Promise<{ text: string; confidence?: number }> {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      const pdf = await getDocument({ data: new Uint8Array(file.buffer), useSystemFonts: true })
        .promise
      const pages: string[] = []
      const confidences: number[] = []
      if (pdf.numPages > MAX_PDF_PAGES)
        throw new Error(`PDF contains more than ${MAX_PDF_PAGES} pages`)

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
        const context = canvas.getContext('2d')
        await page.render({ canvasContext: context as never, viewport }).promise
        const result = await this.recognize(canvas.toBuffer('image/png'))
        pages.push(result.text)
        if (result.confidence !== undefined) confidences.push(result.confidence)
        page.cleanup()
      }
      await pdf.destroy()
      return { text: pages.join('\n'), confidence: this.average(confidences) }
    }

    const result = await this.recognize(file.buffer)
    return result
  }

  private async recognize(image: Buffer): Promise<{ text: string; confidence?: number }> {
    const worker = await this.getWorker()
    const result = await worker.recognize(image, { rotateAuto: true }, { text: true })
    return { text: result.data.text, confidence: result.data.confidence }
  }

  private getWorker() {
    if (!this.workerPromise) {
      this.workerPromise = createWorker('hrv+eng', 1, {
        langPath: process.env.OCR_LANG_PATH ?? 'https://tessdata.projectnaptha.com/4.0.0',
        logger: ({ status, progress }) =>
          this.logger.debug(`${status} ${Math.round(progress * 100)}%`),
      })
    }
    return this.workerPromise
  }

  private average(values: number[]) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
  }

  private failed(sourceFile: string | undefined, message: string): OcrResult {
    return { status: 'failed', sourceFile, message }
  }
}
