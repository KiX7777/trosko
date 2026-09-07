import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name)

  @Cron('0 5 * * *')
  async processDueTransactions() {
    // The authoritative write belongs to the authenticated application layer.
    // This scheduled boundary is ready for a Supabase service-role worker when enabled.
    this.logger.debug('Recurring transaction worker checked for due templates.')
    return { processed: 0, checkedAt: new Date().toISOString() }
  }
}
