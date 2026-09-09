import type { OcrResult } from './ocr.types.js'

const TOTAL_LABEL =
  /\b(?:ukupno|za\s+platiti|iznos\s+za\s+uplatu|grand\s+total|total|amount|suma)\b/i
const DATE_PATTERN =
  /\b(?:([0-3]?\d)[./-]([01]?\d)[./-](\d{2,4})|(\d{4})[./-]([01]?\d)[./-]([0-3]?\d))\b/
const AMOUNT_PATTERN =
  /(?:€|eur|hrk|kn|usd|\$)?\s*\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{1,2})?\s*(?:€|eur|hrk|kn|usd|\$)?/gi

function cleanLine(line: string) {
  return line.replace(/[\t ]+/g, ' ').trim()
}

function parseAmount(value: string): number | undefined {
  const compact = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (!compact || !/[\d]/.test(compact)) return undefined

  const lastComma = compact.lastIndexOf(',')
  const lastDot = compact.lastIndexOf('.')
  let normalized = compact

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    normalized = compact.split(thousandsSeparator).join('').replace(decimalSeparator, '.')
  } else if (lastComma !== -1) {
    const decimals = compact.length - lastComma - 1
    normalized =
      decimals === 1 || decimals === 2 ? compact.replace(',', '.') : compact.replace(',', '')
  } else if (lastDot !== -1) {
    const decimals = compact.length - lastDot - 1
    normalized = decimals === 1 || decimals === 2 ? compact : compact.replace('.', '')
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

function findTotal(lines: string[]): number | undefined {
  for (const line of lines) {
    if (!TOTAL_LABEL.test(line)) continue
    const matches = [...line.matchAll(AMOUNT_PATTERN)]
    const amounts = matches
      .map((match) => parseAmount(match[0]))
      .filter((amount) => amount !== undefined)
    if (amounts.length) return amounts[amounts.length - 1]
  }

  const allAmounts = lines
    .filter((line) => !DATE_PATTERN.test(line))
    .flatMap((line) =>
      [...line.matchAll(AMOUNT_PATTERN)]
        .filter((match) => /[,.]|€|eur|hrk|kn|usd|\$/i.test(match[0]))
        .map((match) => parseAmount(match[0])),
    )
    .filter((amount): amount is number => amount !== undefined)
  return allAmounts.length ? Math.max(...allAmounts) : undefined
}

function findDate(text: string): string | undefined {
  const match = text.match(DATE_PATTERN)
  if (!match) return undefined

  let year: number
  let month: number
  let day: number
  if (match[4]) {
    year = Number(match[4])
    month = Number(match[5])
    day = Number(match[6])
  } else {
    day = Number(match[1])
    month = Number(match[2])
    year = Number(match[3])
    year += year < 100 ? 2000 : 0
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined
  }
  return date.toISOString().slice(0, 10)
}

function findCurrency(text: string): string | undefined {
  if (/€|\bEUR\b/i.test(text)) return 'EUR'
  if (/\bHRK\b|\bkn\b/i.test(text)) return 'HRK'
  if (/\$|\bUSD\b/i.test(text)) return 'USD'
  if (/\bGBP\b|£/i.test(text)) return 'GBP'
  return undefined
}

function findMerchant(lines: string[]): string | undefined {
  return lines.find((line) => {
    if (line.length < 2 || line.length > 60) return false
    if (TOTAL_LABEL.test(line) || DATE_PATTERN.test(line)) return false
    if (
      /^(?:oib|ibAN|iban|tel|telefon|email|www|račun|invoice|broj|address|adresa)\b/i.test(line)
    ) {
      return false
    }
    return /[a-zčćđšž]/i.test(line)
  })
}

function findCategory(text: string): string | undefined {
  const categoryKeywords: Array<[string, string]> = [
    [
      'Hrana',
      'hrana|restoran|kafić|caffe|market|konzum|spar|lidl|plodine|pekara|eurospin|wolt|glovo',
    ],
    ['Prijevoz', 'gorivo|benz|ina|taxi|uber|bolt|parking|cestarina|petrol|shell|lukoil|autocesta'],
    [
      'Stanovanje',
      'struja|voda|plin|najam|stanarina|internet|telekom|optika|telemach|a1|vipnet|huawei',
    ],
    ['Zdravlje', 'ljekarna|apoteka|doktor|poliklinika|zub|farmacija'],
    ['Kupovina', 'trgovina|shop|odjeća|obuća|tehnika'],
  ]
  return categoryKeywords.find(([, keywords]) => new RegExp(keywords, 'i').test(text))?.[0]
}

export function parseReceiptText(
  text: string,
  sourceFile?: string,
  confidence?: number,
): OcrResult {
  const normalizedText = text.replace(/\r/g, '').trim()
  const lines = normalizedText.split('\n').map(cleanLine).filter(Boolean)
  const total = findTotal(lines)
  const merchant = findMerchant(lines)
  const date = findDate(normalizedText)
  const currency = findCurrency(normalizedText)
  const suggestedCategory = findCategory(normalizedText)
  const normalizedConfidence = confidence === undefined ? undefined : Math.round(confidence)
  const complete = Boolean(normalizedText && total !== undefined && merchant && date)
  const usableConfidence = normalizedConfidence === undefined || normalizedConfidence >= 55

  return {
    status: complete && usableConfidence ? 'completed' : 'needs_review',
    sourceFile,
    merchant,
    date,
    currency,
    total,
    suggestedCategory,
    confidence: normalizedConfidence,
    extractedText: normalizedText || undefined,
    message:
      complete && usableConfidence
        ? 'OCR je završen. Provjeri prijedlog prije spremanja transakcije.'
        : 'OCR je završen, ali račun treba ručnu provjeru prije spremanja transakcije.',
  }
}
