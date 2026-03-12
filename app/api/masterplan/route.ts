import { NextRequest, NextResponse } from 'next/server';
import { analyzeCity, discoverLeads, CITY_SEEDS } from '@/lib/modules/masterplan-engine';

export async function POST(req: NextRequest) {
  try {
    const { city, action, entityType } = await req.json();

    if (action === 'leads') {
      if (!city) {
        return NextResponse.json({ error: 'City is required' }, { status: 400 });
      }
      const leads = await discoverLeads(city, entityType);
      return NextResponse.json({ leads, city });
    }

    if (!city) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }

    const analysis = await analyzeCity(city);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Masterplan error:', error);
    return NextResponse.json({ error: 'Masterplan analysis failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    cities: CITY_SEEDS.map((c) => ({ name: c.name, country: c.country })),
    total: CITY_SEEDS.length,
  });
}
