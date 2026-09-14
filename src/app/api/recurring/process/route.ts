import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function processDueTransactions(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ processed: 0, checkedAt: new Date().toISOString(), skipped: true })
  }
  const supabase = createClient(url, serviceRoleKey)
  const { data, error } = await supabase.rpc('process_due_recurring_transactions')
  if (error) {
    console.error('Recurring transaction processing failed', error)
    return NextResponse.json(
      { message: 'Obrada ponavljajućih transakcija nije uspjela.' },
      { status: 500 },
    )
  }
  return NextResponse.json({ processed: Number(data ?? 0), checkedAt: new Date().toISOString() })
}

export async function POST(request: Request) {
  return processDueTransactions(request)
}

export async function GET(request: Request) {
  return processDueTransactions(request)
}
