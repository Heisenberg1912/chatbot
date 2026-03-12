import { NextRequest, NextResponse } from 'next/server';
import { analyzeSiteImage, analyzeAdvanced } from '@/lib/modules/site-analyzer';

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType, location, currency, advanced, baseResult } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    if (advanced && baseResult) {
      const result = await analyzeAdvanced(image, mimeType || 'image/jpeg', baseResult);
      return NextResponse.json({ result, type: 'advanced' });
    }

    const result = await analyzeSiteImage(
      image,
      mimeType || 'image/jpeg',
      location,
      currency
    );
    return NextResponse.json({ result, type: 'base' });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
