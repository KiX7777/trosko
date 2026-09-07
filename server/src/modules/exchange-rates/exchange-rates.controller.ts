import { Controller, Get, Query } from '@nestjs/common'
import { ExchangeRatesService } from './exchange-rates.service.js'

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  getRates(@Query('base') base?: string) {
    return this.exchangeRatesService.getRates(base?.toUpperCase() || 'EUR')
  }
}
