import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name)

  async getRates(base = 'EUR') {
    const endpoint = process.env.EXCHANGE_RATES_ENDPOINT
    if (endpoint) {
      try {
        const url = new URL(endpoint)
        url.searchParams.set('base', base)
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Exchange provider returned ${response.status}`)
        return (await response.json()) as Record<string, unknown>
      } catch (error) {
        this.logger.warn(`Exchange-rate provider unavailable: ${String(error)}`)
      }
    }
    return { base, rates: { EUR: 1, USD: 1.09, GBP: 0.86, CHF: 0.94 }, source: 'fallback' }
  }
}
