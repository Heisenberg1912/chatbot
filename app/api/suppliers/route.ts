import { NextRequest, NextResponse } from 'next/server';
import {
  searchSuppliers,
  getSupplierStats,
  getCategories,
  getCountries,
  recommendMaterials,
} from '@/lib/modules/material-finder';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getSupplierStats();
      return NextResponse.json(stats);
    }

    if (action === 'categories') {
      return NextResponse.json({ categories: getCategories() });
    }

    if (action === 'countries') {
      return NextResponse.json({ countries: getCountries() });
    }

    const result = await searchSuppliers({
      country: searchParams.get('country') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      query: searchParams.get('q') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20)),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Suppliers error:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectType, location, budget } = await req.json();
    const recommendation = await recommendMaterials(projectType, location, budget);
    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Material recommendation error:', error);
    return NextResponse.json({ error: 'Recommendation failed' }, { status: 500 });
  }
}
