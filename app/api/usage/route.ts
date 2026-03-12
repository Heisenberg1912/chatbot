import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Usage } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';

const FREE_LIMIT = 5;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module') || 'general';

    await connectDB();
    const currentUser = await getCurrentUser();

    // Pro users have unlimited access
    const isPro =
      currentUser?.subscription?.plan === 'pro' ||
      currentUser?.subscription?.plan === 'enterprise';
    const isNotExpired =
      !currentUser?.subscription?.endDate ||
      new Date(currentUser.subscription.endDate) > new Date();
    if (isPro && currentUser?.subscription?.status === 'active' && isNotExpired) {
      return NextResponse.json({
        freeUsed: 0,
        freeLimit: FREE_LIMIT,
        remaining: -1,
        paid: true,
      });
    }

    // For free users, use userId or fallback to query param key
    const key = currentUser ? currentUser._id.toString() : searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const usage = await Usage.findOne({ key, module });

    return NextResponse.json({
      freeUsed: usage?.freeUsed || 0,
      freeLimit: FREE_LIMIT,
      remaining: FREE_LIMIT - (usage?.freeUsed || 0),
      paid: false,
    });
  } catch (error) {
    console.error('Usage error:', error);
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, module } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    await connectDB();
    const usage = await Usage.findOneAndUpdate(
      { key, module: module || 'general' },
      { $inc: { freeUsed: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      freeUsed: usage.freeUsed,
      freeLimit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - usage.freeUsed),
    });
  } catch (error) {
    console.error('Usage increment error:', error);
    return NextResponse.json({ error: 'Failed to update usage' }, { status: 500 });
  }
}
