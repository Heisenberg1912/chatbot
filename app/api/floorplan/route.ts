import { NextRequest, NextResponse } from 'next/server';
import { generateFloorPlan, analyzeSketch, generateInsights } from '@/lib/modules/floorplan-generator';

export async function POST(req: NextRequest) {
  try {
    const { description, image, mimeType, action } = await req.json();

    if (action === 'sketch' && image) {
      const plan = await analyzeSketch(image, mimeType || 'image/jpeg');
      return NextResponse.json({ plan });
    }

    if (action === 'insights' && description) {
      const plan = await generateFloorPlan(description);
      const insights = await generateInsights(plan);
      return NextResponse.json({ insights, plan });
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const plan = await generateFloorPlan(description);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Floorplan error:', error);
    return NextResponse.json({ error: 'Floor plan generation failed' }, { status: 500 });
  }
}
