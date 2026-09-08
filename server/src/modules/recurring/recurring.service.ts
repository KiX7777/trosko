import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name)
  private readonly supabase: SupabaseClient | null

  constructor() {
    const url = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null
  }

  @Cron('0 5 * * *')
  async processDueTransactions() {
    if (!this.supabase) {
      this.logger.debug(
        'Recurring transaction worker skipped: Supabase worker credentials are missing.',
      )
      return { processed: 0, checkedAt: new Date().toISOString(), skipped: true }
    }

    const { data, error } = await this.supabase.rpc('process_due_recurring_transactions')
    if (error) throw error
    return { processed: Number(data ?? 0), checkedAt: new Date().toISOString() }
  }
}
