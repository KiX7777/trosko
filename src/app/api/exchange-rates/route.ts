import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const base = request.nextUrl.searchParams.get('base')?.toUpperCase() || 'EUR'
  const endpoint = process.env.EXCHANGE_RATES_ENDPOINT
  if (endpoint) {
    try {
      const url = new URL(endpoint)
      url.searchParams.set('base', base)
      const response = await fetch(url, { next: { revalidate: 3600 } })
      if (!response.ok) throw new Error(`Exchange provider returned ${response.status}`)
      return NextResponse.json(await response.json())
    } catch (error) {
      console.warn(`Exchange-rate provider unavailable: ${String(error)}`)
    }
  }
  return NextResponse.json({
    base,
    rates: { EUR: 1, USD: 1.09, GBP: 0.86, CHF: 0.94 },
    source: 'fallback',
  })
}
