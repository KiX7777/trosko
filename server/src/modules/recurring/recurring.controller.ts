import { Controller, Post } from '@nestjs/common'
import { RecurringService } from './recurring.service.js'

@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post('process')
  process() {
    return this.recurringService.processDueTransactions()
  }
}
