import { NextResponse } from 'next/server'
import { parseReceipt } from '../../../../server/ocr'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const uploaded = formData.get('file')
    const text = formData.get('text')
    const fileName = formData.get('fileName')
    if (uploaded instanceof File) {
      const buffer = Buffer.from(await uploaded.arrayBuffer())
      return NextResponse.json(
        await parseReceipt({
          buffer,
          fileName: uploaded.name,
          mimeType: uploaded.type,
          text: typeof text === 'string' ? text : undefined,
        }),
      )
    }
    return NextResponse.json(
      await parseReceipt({
        text: typeof text === 'string' ? text : undefined,
        fileName: typeof fileName === 'string' ? fileName : undefined,
      }),
    )
  }

  const body = (await request.json().catch(() => ({}))) as { text?: string; fileName?: string }
  return NextResponse.json(await parseReceipt(body))
}
