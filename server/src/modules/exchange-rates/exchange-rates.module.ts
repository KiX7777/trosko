import { Module } from '@nestjs/common'
import { ExchangeRatesController } from './exchange-rates.controller.js'
import { ExchangeRatesService } from './exchange-rates.service.js'

@Module({ controllers: [ExchangeRatesController], providers: [ExchangeRatesService] })
export class ExchangeRatesModule {}
