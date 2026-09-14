import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createWorker, type Worker } from 'tesseract.js'
import { parseReceiptText, type OcrResult } from './ocr-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_PDF_PAGES = 10
let workerPromise: Promise<Worker> | undefined

for (const [name, value] of Object.entries({ DOMMatrix, ImageData, Path2D })) {
  if (!(name in globalThis)) Object.assign(globalThis, { [name]: value })
}

export type OcrInput = { buffer?: Buffer; fileName?: string; mimeType?: string; text?: string }

function failed(sourceFile: string | undefined, message: string): OcrResult {
  return { status: 'failed', sourceFile, message }
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('hrv+eng', 1, {
      langPath: process.env.OCR_LANG_PATH ?? 'https://tessdata.projectnaptha.com/4.0.0',
    })
  }
  return workerPromise
}

async function recognize(image: Buffer) {
  const worker = await getWorker()
  const result = await worker.recognize(image, { rotateAuto: true }, { text: true })
  return { text: result.data.text, confidence: result.data.confidence }
}

async function extractText(input: Required<Pick<OcrInput, 'buffer' | 'fileName' | 'mimeType'>>) {
  if (input.mimeType === 'application/pdf' || input.fileName.toLowerCase().endsWith('.pdf')) {
    const pdf = await getDocument({ data: new Uint8Array(input.buffer), useSystemFonts: true })
      .promise
    if (pdf.numPages > MAX_PDF_PAGES)
      throw new Error(`PDF contains more than ${MAX_PDF_PAGES} pages`)
    const pages: string[] = []
    const confidences: number[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext('2d')
      await page.render({ canvasContext: context as never, viewport }).promise
      const result = await recognize(canvas.toBuffer('image/png'))
      pages.push(result.text)
      confidences.push(result.confidence)
      page.cleanup()
    }
    await pdf.destroy()
    return {
      text: pages.join('\n'),
      confidence: confidences.reduce((sum, value) => sum + value, 0) / confidences.length,
    }
  }
  return recognize(input.buffer)
}

export async function parseReceipt(input: OcrInput): Promise<OcrResult> {
  const sourceFile = input.fileName
  try {
    if (input.buffer) {
      if (input.buffer.byteLength > MAX_FILE_SIZE)
        return failed(sourceFile, 'Datoteka je prevelika. Najveća dopuštena veličina je 10 MB.')
      if (!input.mimeType?.startsWith('image/') && input.mimeType !== 'application/pdf')
        return failed(sourceFile, 'Podržane su samo slikovne i PDF datoteke.')
      const result = await extractText({
        buffer: input.buffer,
        fileName: sourceFile ?? 'receipt',
        mimeType: input.mimeType,
      })
      return parseReceiptText(result.text, sourceFile, result.confidence)
    }
    if (input.text?.trim()) return parseReceiptText(input.text, sourceFile)
    return failed(sourceFile, 'Nije poslana datoteka niti tekst za OCR obradu.')
  } catch (error) {
    console.error(`OCR failed for ${sourceFile ?? 'unknown file'}`, error)
    return failed(sourceFile, 'OCR obrada nije uspjela. Pokušaj ponovno ili provjeri račun ručno.')
  }
}
