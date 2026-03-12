import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  SGD: 0.016,
  AUD: 0.018,
  CAD: 0.016,
  JPY: 1.79,
  CNY: 0.087,
  SAR: 0.045,
  QAR: 0.044,
  KES: 1.84,
  NGN: 18.0,
  ZAR: 0.22,
  THB: 0.42,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const base = searchParams.get('base') || 'INR';

  // Return fallback rates
  return NextResponse.json({
    base,
    rates: FALLBACK_RATES,
    timestamp: new Date().toISOString(),
  });
}
