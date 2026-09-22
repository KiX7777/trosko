import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

type RecordValue = Record<string, unknown>
type TransactionType = 'expense' | 'income' | 'transfer'

export type PdfReportTransaction = {
  transactionDate: string
  description: string
  merchant?: string
  notes?: string
  type: TransactionType
  amount: number
  amountBase: number
  currency: string
  exchangeRate: number
  accountName: string
  categoryName?: string
  labels: string[]
  hasReceipt: boolean
  recurring: boolean
}

export type PdfReport = {
  dateFrom: string
  dateTo: string
  profile: {
    displayName: string
    email?: string
    primaryCurrency: string
  }
  transactions: PdfReportTransaction[]
}

const PAGE = { width: 841.89, height: 595.28, margin: 48 }
const FONT_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../node_modules/pdfjs-dist/standard_fonts',
)
const COLORS = {
  background: '#0b1326',
  panel: '#13203a',
  panelRaised: '#1a2a48',
  tableAlternate: '#101d35',
  border: '#2a3a59',
  text: '#f4f7fc',
  muted: '#9aaac6',
  teal: '#6bd8cb',
  income: '#4edea3',
  expense: '#f7a8c4',
  transfer: '#c0c1ff',
}
const TABLE_PADDING_X = 16
const TABLE_HEADER_HEIGHT = 30
const TABLE_COLUMNS = [
  { label: 'DATUM', x: PAGE.margin + TABLE_PADDING_X, width: 62 },
  { label: 'TRANSAKCIJA I DETALJI', x: 142, width: 218 },
  { label: 'RAČUN', x: 376, width: 92 },
  { label: 'KATEGORIJA I OZNAKE', x: 484, width: 118 },
  { label: 'TIP', x: 618, width: 64 },
  { label: 'IZNOS', x: 698, width: 80 },
] as const

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecords(value: unknown): RecordValue[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function optionalString(value: unknown): string | undefined {
  const result = stringValue(value).trim()
  return result || undefined
}

function numberValue(value: unknown, fallback = 0): number {
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : fallback
}

function transactionType(value: unknown): TransactionType {
  return value === 'income' || value === 'transfer' ? value : 'expense'
}

function currency(value: unknown, fallback = 'EUR'): string {
  const result = stringValue(value, fallback).toUpperCase()
  return /^[A-Z]{3}$/.test(result) ? result : fallback
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatDateTime(value = new Date()): string {
  return new Intl.DateTimeFormat('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatMoney(value: number, code: string): string {
  try {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${code}`
  }
}

function typeLabel(type: TransactionType): string {
  if (type === 'income') return 'Prihod'
  if (type === 'transfer') return 'Prijenos'
  return 'Trošak'
}

function typeColor(type: TransactionType): string {
  if (type === 'income') return COLORS.income
  if (type === 'transfer') return COLORS.transfer
  return COLORS.expense
}

function signedAmount(transaction: PdfReportTransaction): string {
  const prefix = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''
  return `${prefix}${formatMoney(transaction.amount, transaction.currency)}`
}

function rangeLabel(report: Pick<PdfReport, 'dateFrom' | 'dateTo'>): string {
  return `${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}`
}

@Injectable()
export class ExportsService {
  constructor(private readonly config: ConfigService) {}

  async loadAuthenticatedReport(
    accessToken: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<PdfReport> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      throw new ServiceUnavailableException(
        'PDF izvještaj nije konfiguriran. Nedostaju SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY.',
      )
    }

    const database = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: authData, error: authError } = await database.auth.getUser(accessToken)
    if (authError || !authData.user) throw new UnauthorizedException('Prijava je istekla.')

    const user = authData.user
    const [profileResult, accountsResult, categoriesResult, labelsResult, transactions] =
      await Promise.all([
        database
          .from('profiles')
          .select('display_name, email, primary_currency')
          .eq('id', user.id)
          .maybeSingle(),
        database.from('accounts').select('id, name').eq('user_id', user.id),
        database.from('categories').select('id, name').eq('user_id', user.id),
        database.from('labels').select('id, name').eq('user_id', user.id),
        this.loadTransactions(database, user.id, dateFrom, dateTo),
      ])

    if (profileResult.error) throw new BadRequestException(profileResult.error.message)
    if (accountsResult.error) throw new BadRequestException(accountsResult.error.message)
    if (categoriesResult.error) throw new BadRequestException(categoriesResult.error.message)
    if (labelsResult.error) throw new BadRequestException(labelsResult.error.message)

    const profile: RecordValue = isRecord(profileResult.data) ? profileResult.data : {}
    const accountNames = this.toNameMap(accountsResult.data)
    const categoryNames = this.toNameMap(categoriesResult.data)
    const labelNames = this.toNameMap(labelsResult.data)
    const labelsByTransaction = await this.loadLabelsByTransaction(
      database,
      transactions.map((transaction) => stringValue(transaction.id)).filter(Boolean),
    )

    return {
      dateFrom,
      dateTo,
      profile: {
        displayName:
          optionalString(profile.display_name) ??
          optionalString(user.user_metadata?.display_name) ??
          user.email ??
          'Korisnik Troška',
        email: optionalString(profile.email) ?? user.email ?? undefined,
        primaryCurrency: currency(profile.primary_currency),
      },
      transactions: transactions.map((transaction) =>
        this.mapDatabaseTransaction(
          transaction,
          accountNames,
          categoryNames,
          labelNames,
          labelsByTransaction,
        ),
      ),
    }
  }

  createDemoReport(payload: unknown, dateFrom: string, dateTo: string): PdfReport {
    if (!payload || !isRecord(payload)) {
      throw new BadRequestException('Demo podaci za PDF izvještaj nisu dostupni.')
    }

    const profile = isRecord(payload.profile) ? payload.profile : {}
    const accountNames = this.toNameMap(payload.accounts)
    const categoryNames = this.toNameMap(payload.categories)
    const labelNames = this.toNameMap(payload.labels)
    const transactions = asRecords(payload.transactions)
      .map((transaction) => this.mapDemoTransaction(transaction, accountNames, categoryNames, labelNames))
      .filter(
        (transaction) =>
          transaction.transactionDate >= dateFrom && transaction.transactionDate <= dateTo,
      )
      .sort((first, second) => second.transactionDate.localeCompare(first.transactionDate))

    return {
      dateFrom,
      dateTo,
      profile: {
        displayName: optionalString(profile.displayName) ?? 'Demo korisnik',
        email: optionalString(profile.email),
        primaryCurrency: currency(profile.primaryCurrency),
      },
      transactions,
    }
  }

  createPdf(report: PdfReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        autoFirstPage: false,
        layout: 'landscape',
        margin: 0,
        size: 'A4',
      })
      document.registerFont('Trosko-Regular', join(FONT_DIRECTORY, 'LiberationSans-Regular.ttf'))
      document.registerFont('Trosko-Bold', join(FONT_DIRECTORY, 'LiberationSans-Bold.ttf'))
      const chunks: Buffer[] = []
      let pageNumber = 0

      document.on('data', (chunk: Buffer) => chunks.push(chunk))
      document.on('error', reject)
      document.on('end', () => resolve(Buffer.concat(chunks)))

      const addPage = (section: string) => {
        pageNumber += 1
        document.addPage({ layout: 'landscape', margin: 0, size: 'A4' })
        document.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.background)
        document.rect(0, 0, 6, PAGE.height).fill(COLORS.teal)
        document
          .font('Trosko-Bold')
          .fontSize(9)
          .fillColor(COLORS.teal)
          .text('TROŠKO', PAGE.margin, 33, { characterSpacing: 1.6 })
        document
          .font('Trosko-Regular')
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(section, PAGE.margin, 49, { characterSpacing: 0.9 })
        document
          .strokeColor(COLORS.border)
          .lineWidth(1)
          .moveTo(PAGE.margin, 75)
          .lineTo(PAGE.width - PAGE.margin, 75)
          .stroke()
        document
          .font('Trosko-Regular')
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text(`Generirano ${formatDateTime()} | Stranica ${pageNumber}`, PAGE.margin, 558, {
            width: PAGE.width - PAGE.margin * 2,
            align: 'right',
          })
      }

      const drawMetricCard = (
        x: number,
        y: number,
        width: number,
        label: string,
        value: string,
        accent: string,
      ) => {
        document.roundedRect(x, y, width, 82, 12).fill(COLORS.panel)
        document.roundedRect(x, y, 5, 82, 3).fill(accent)
        document
          .font('Trosko-Bold')
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text(label.toUpperCase(), x + 18, y + 16, { characterSpacing: 0.7, width: width - 34 })
        document
          .font('Trosko-Bold')
          .fontSize(18)
          .fillColor(COLORS.text)
          .text(value, x + 18, y + 39, { width: width - 34, lineBreak: false })
      }

      const drawExpenseBreakdown = (y: number) => {
        const categories = new Map<string, number>()
        report.transactions
          .filter((transaction) => transaction.type === 'expense')
          .forEach((transaction) => {
            const category = transaction.categoryName ?? 'Bez kategorije'
            categories.set(category, (categories.get(category) ?? 0) + transaction.amountBase)
          })
        const total = [...categories.values()].reduce((sum, amount) => sum + amount, 0)
        const items = [...categories.entries()]
          .map(([name, amount]) => ({ name, amount }))
          .sort((first, second) => second.amount - first.amount)
          .slice(0, 5)

        document.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 144, 12).fill(COLORS.panel)
        document
          .font('Trosko-Bold')
          .fontSize(9)
          .fillColor(COLORS.text)
          .text('Raspodjela troškova', PAGE.margin + 18, y + 17)
        document
          .font('Trosko-Regular')
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text('Najveće kategorije u odabranom razdoblju', PAGE.margin + 18, y + 32)

        if (!items.length) {
          document
            .font('Trosko-Regular')
            .fontSize(9)
            .fillColor(COLORS.muted)
            .text('U ovom razdoblju nema evidentiranih troškova.', PAGE.margin + 18, y + 79)
          return
        }

        const itemWidth = (PAGE.width - PAGE.margin * 2 - 36) / items.length
        items.forEach((item, index) => {
          const x = PAGE.margin + 18 + index * itemWidth
          const percentage = total ? Math.round((item.amount / total) * 100) : 0
          document
            .font('Trosko-Bold')
            .fontSize(8)
            .fillColor(COLORS.text)
            .text(item.name, x, y + 62, { width: itemWidth - 12, height: 12, ellipsis: true })
          document.roundedRect(x, y + 84, itemWidth - 12, 7, 3.5).fill(COLORS.panelRaised)
          document
            .roundedRect(x, y + 84, Math.max(5, ((itemWidth - 12) * percentage) / 100), 7, 3.5)
            .fill(COLORS.expense)
          document
            .font('Trosko-Bold')
            .fontSize(8)
            .fillColor(COLORS.expense)
            .text(`${percentage}%`, x, y + 103, { width: itemWidth - 12 })
          document
            .font('Trosko-Regular')
            .fontSize(7.5)
            .fillColor(COLORS.muted)
            .text(formatMoney(item.amount, report.profile.primaryCurrency), x, y + 117, {
              width: itemWidth - 12,
            })
        })
      }

      const drawTableHeader = (y: number) => {
        document
          .roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, TABLE_HEADER_HEIGHT, 7)
          .fill(COLORS.panelRaised)
        TABLE_COLUMNS.forEach((column) => {
          document
            .font('Trosko-Bold')
            .fontSize(6.5)
            .fillColor(COLORS.muted)
            .text(column.label, column.x, y + 10, {
              width: column.width,
              characterSpacing: 0.5,
              align: column.label === 'IZNOS' ? 'right' : 'left',
              lineBreak: false,
            })
        })
      }

      const rowHeight = (transaction: PdfReportTransaction) => {
        const details = this.transactionDetails(transaction)
        const [, detailsColumn, accountColumn, categoryColumn] = TABLE_COLUMNS
        document.font('Trosko-Bold').fontSize(9)
        const titleHeight = document.heightOfString(transaction.description, { width: detailsColumn.width })
        document.font('Trosko-Regular').fontSize(7.5)
        const detailsHeight = details
          ? document.heightOfString(details, { width: detailsColumn.width })
          : 0
        const accountHeight = document.heightOfString(transaction.accountName, {
          width: accountColumn.width,
        })
        const categoryContent = [transaction.categoryName ?? 'Bez kategorije', transaction.labels.join(', ')]
          .filter(Boolean)
          .join('\n')
        const categoryHeight = document.heightOfString(categoryContent, {
          width: categoryColumn.width,
        })
        return Math.max(
          48,
          Math.ceil(Math.max(titleHeight + detailsHeight + 19, accountHeight, categoryHeight) + 20),
        )
      }

      const drawTransactionRow = (
        transaction: PdfReportTransaction,
        y: number,
        height: number,
        index: number,
      ) => {
        const [date, detailsColumn, account, category, type, amount] = TABLE_COLUMNS
        document.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, height).fill(
          index % 2 ? COLORS.tableAlternate : COLORS.panel,
        )
        document
          .strokeColor(COLORS.border)
          .lineWidth(0.5)
          .moveTo(PAGE.margin, y + height)
          .lineTo(PAGE.width - PAGE.margin, y + height)
          .stroke()
        document
          .font('Trosko-Regular')
          .fontSize(8)
          .fillColor(COLORS.text)
          .text(formatDate(transaction.transactionDate), date.x, y + 14, {
            width: date.width,
          })
        document
          .font('Trosko-Bold')
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(transaction.description, detailsColumn.x, y + 13, { width: detailsColumn.width })
        const titleHeight = document.heightOfString(transaction.description, {
          width: detailsColumn.width,
        })
        const details = this.transactionDetails(transaction)
        if (details) {
          document
            .font('Trosko-Regular')
            .fontSize(7.5)
            .fillColor(COLORS.muted)
            .text(details, detailsColumn.x, y + 26 + titleHeight, { width: detailsColumn.width })
        }
        document
          .font('Trosko-Regular')
          .fontSize(8)
          .fillColor(COLORS.text)
          .text(transaction.accountName, account.x, y + 14, { width: account.width })
        document
          .font('Trosko-Regular')
          .fontSize(8)
          .fillColor(COLORS.text)
          .text(transaction.categoryName ?? 'Bez kategorije', category.x, y + 14, {
            width: category.width,
          })
        if (transaction.labels.length) {
          document
            .font('Trosko-Regular')
            .fontSize(7)
            .fillColor(COLORS.teal)
            .text(transaction.labels.join(', '), category.x, y + 29, {
              width: category.width,
            })
        }
        document
          .font('Trosko-Bold')
          .fontSize(8)
          .fillColor(typeColor(transaction.type))
          .text(typeLabel(transaction.type), type.x, y + 14, { width: type.width })
        document
          .font('Trosko-Bold')
          .fontSize(9)
          .fillColor(typeColor(transaction.type))
          .text(signedAmount(transaction), amount.x, y + 13, {
            width: amount.width,
            align: 'right',
          })
        if (transaction.currency !== report.profile.primaryCurrency) {
          document
            .font('Trosko-Regular')
            .fontSize(7)
            .fillColor(COLORS.muted)
            .text(formatMoney(transaction.amountBase, report.profile.primaryCurrency), amount.x, y + 28, {
              width: amount.width,
              align: 'right',
            })
        }
      }

      const income = report.transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amountBase, 0)
      const expenses = report.transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amountBase, 0)
      const net = income - expenses

      addPage('FINANCIJSKI IZVJEŠTAJ')
      document
        .font('Trosko-Bold')
        .fontSize(25)
        .fillColor(COLORS.text)
        .text('Pregled financija', PAGE.margin, 101)
      document
        .font('Trosko-Regular')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(`Razdoblje: ${rangeLabel(report)}`, PAGE.margin, 137)
      document
        .font('Trosko-Bold')
        .fontSize(10)
        .fillColor(COLORS.teal)
        .text(report.profile.displayName, PAGE.margin, 156, { width: 360 })
      if (report.profile.email) {
        document
          .font('Trosko-Regular')
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(report.profile.email, PAGE.margin, 172, { width: 360 })
      }

      const cardGap = 12
      const cardWidth = (PAGE.width - PAGE.margin * 2 - cardGap * 3) / 4
      drawMetricCard(
        PAGE.margin,
        203,
        cardWidth,
        'Prihodi',
        formatMoney(income, report.profile.primaryCurrency),
        COLORS.income,
      )
      drawMetricCard(
        PAGE.margin + (cardWidth + cardGap),
        203,
        cardWidth,
        'Troškovi',
        formatMoney(expenses, report.profile.primaryCurrency),
        COLORS.expense,
      )
      drawMetricCard(
        PAGE.margin + (cardWidth + cardGap) * 2,
        203,
        cardWidth,
        'Neto tijek',
        `${net >= 0 ? '+' : ''}${formatMoney(net, report.profile.primaryCurrency)}`,
        net >= 0 ? COLORS.income : COLORS.expense,
      )
      drawMetricCard(
        PAGE.margin + (cardWidth + cardGap) * 3,
        203,
        cardWidth,
        'Evidentirano',
        `${report.transactions.length} transakcija`,
        COLORS.teal,
      )
      drawExpenseBreakdown(309)

      if (!report.transactions.length) {
        document.roundedRect(PAGE.margin, 471, PAGE.width - PAGE.margin * 2, 45, 10).fill(COLORS.panelRaised)
        document
          .font('Trosko-Regular')
          .fontSize(10)
          .fillColor(COLORS.muted)
          .text('Nema transakcija u odabranom rasponu datuma.', PAGE.margin + 18, 487)
      } else {
        let tableY = 0
        let tableRowIndex = 0
        const startTransactionPage = () => {
          addPage('DETALJI TRANSAKCIJA')
          document
            .font('Trosko-Bold')
            .fontSize(15)
            .fillColor(COLORS.text)
            .text('Sve transakcije', PAGE.margin, 97)
          document
            .font('Trosko-Regular')
            .fontSize(8.5)
            .fillColor(COLORS.muted)
            .text(`${rangeLabel(report)} | ${report.transactions.length} zapisa`, PAGE.margin, 118)
          tableY = 144
          drawTableHeader(tableY)
          tableY += TABLE_HEADER_HEIGHT
        }

        startTransactionPage()
        report.transactions.forEach((transaction) => {
          const height = rowHeight(transaction)
          if (tableY + height > 542) startTransactionPage()
          drawTransactionRow(transaction, tableY, height, tableRowIndex)
          tableY += height
          tableRowIndex += 1
        })
      }

      document.end()
    })
  }

  private async loadTransactions(
    database: SupabaseClient,
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<RecordValue[]> {
    const transactions: RecordValue[] = []
    const pageSize = 1_000
    let offset = 0

    while (true) {
      const { data, error } = await database
        .from('transactions')
        .select(
          'id, account_id, category_id, type, amount, amount_base, currency, exchange_rate, description, merchant, transaction_date, notes, recurring_transaction_id, receipt_id, created_at',
        )
        .eq('user_id', userId)
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
      if (error) throw new BadRequestException(error.message)

      const page = asRecords(data)
      transactions.push(...page)
      if (page.length < pageSize) return transactions
      offset += page.length
    }
  }

  private async loadLabelsByTransaction(
    database: SupabaseClient,
    transactionIds: string[],
  ): Promise<Map<string, string[]>> {
    const labelsByTransaction = new Map<string, string[]>()
    const batchSize = 300

    for (let index = 0; index < transactionIds.length; index += batchSize) {
      const batch = transactionIds.slice(index, index + batchSize)
      const { data, error } = await database
        .from('transaction_labels')
        .select('transaction_id, label_id')
        .in('transaction_id', batch)
      if (error) throw new BadRequestException(error.message)

      asRecords(data).forEach((row) => {
        const transactionId = stringValue(row.transaction_id)
        const labelId = stringValue(row.label_id)
        if (!transactionId || !labelId) return
        const current = labelsByTransaction.get(transactionId) ?? []
        current.push(labelId)
        labelsByTransaction.set(transactionId, current)
      })
    }

    return labelsByTransaction
  }

  private toNameMap(value: unknown): Map<string, string> {
    return new Map(
      asRecords(value)
        .map((row) => [stringValue(row.id), optionalString(row.name)] as const)
        .filter(([id, name]) => Boolean(id && name)) as Array<[string, string]>,
    )
  }

  private mapDatabaseTransaction(
    row: RecordValue,
    accountNames: Map<string, string>,
    categoryNames: Map<string, string>,
    labelNames: Map<string, string>,
    labelsByTransaction: Map<string, string[]>,
  ): PdfReportTransaction {
    const transactionId = stringValue(row.id)
    return {
      transactionDate: stringValue(row.transaction_date),
      description: optionalString(row.description) ?? 'Bez opisa',
      merchant: optionalString(row.merchant),
      notes: optionalString(row.notes),
      type: transactionType(row.type),
      amount: numberValue(row.amount),
      amountBase: numberValue(row.amount_base, numberValue(row.amount)),
      currency: currency(row.currency),
      exchangeRate: numberValue(row.exchange_rate, 1),
      accountName: accountNames.get(stringValue(row.account_id)) ?? 'Nepoznat račun',
      categoryName: categoryNames.get(stringValue(row.category_id)),
      labels: (labelsByTransaction.get(transactionId) ?? [])
        .map((labelId) => labelNames.get(labelId))
        .filter((label): label is string => Boolean(label)),
      hasReceipt: Boolean(optionalString(row.receipt_id)),
      recurring: Boolean(optionalString(row.recurring_transaction_id)),
    }
  }

  private mapDemoTransaction(
    row: RecordValue,
    accountNames: Map<string, string>,
    categoryNames: Map<string, string>,
    labelNames: Map<string, string>,
  ): PdfReportTransaction {
    const labelIds = Array.isArray(row.labelIds)
      ? row.labelIds.map((value) => stringValue(value)).filter(Boolean)
      : []
    return {
      transactionDate: stringValue(row.transactionDate),
      description: optionalString(row.description) ?? 'Bez opisa',
      merchant: optionalString(row.merchant),
      notes: optionalString(row.notes),
      type: transactionType(row.type),
      amount: numberValue(row.amount),
      amountBase: numberValue(row.amountBase, numberValue(row.amount)),
      currency: currency(row.currency),
      exchangeRate: numberValue(row.exchangeRate, 1),
      accountName: accountNames.get(stringValue(row.accountId)) ?? 'Nepoznat račun',
      categoryName: categoryNames.get(stringValue(row.categoryId)),
      labels: labelIds
        .map((labelId) => labelNames.get(labelId))
        .filter((label): label is string => Boolean(label)),
      hasReceipt: Boolean(optionalString(row.receiptId)),
      recurring: Boolean(optionalString(row.recurringTransactionId)),
    }
  }

  private transactionDetails(transaction: PdfReportTransaction): string {
    const details = [
      transaction.merchant ? `Trgovac: ${transaction.merchant}` : undefined,
      transaction.notes ? `Bilješka: ${transaction.notes}` : undefined,
      transaction.recurring ? 'Ponavljajuća transakcija' : undefined,
      transaction.hasReceipt ? 'Račun je priložen' : undefined,
      transaction.exchangeRate !== 1 ? `Tečaj: ${transaction.exchangeRate}` : undefined,
    ].filter((detail): detail is string => Boolean(detail))
    return details.join('\n')
  }
}
