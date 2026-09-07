import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { ExchangeRatesModule } from './modules/exchange-rates/exchange-rates.module.js'
import { ExportsModule } from './modules/exports/exports.module.js'
import { OcrModule } from './modules/ocr/ocr.module.js'
import { RecurringModule } from './modules/recurring/recurring.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    OcrModule,
    ExportsModule,
    ExchangeRatesModule,
    RecurringModule,
  ],
})
export class AppModule {}
