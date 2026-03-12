import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    console.warn('Auth check failed:', err);
    return NextResponse.json({ user: null });
  }
}
