import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ChatSession, IChatMessage } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ sessions: [] });
    }

    await connectDB();

    const sessions = await ChatSession.find({ userId: currentUser._id.toString() })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const formatted = sessions.map((s) => ({
      id: s.sessionId,
      title: s.title,
      module: s.module,
      messages: s.messages.map((m: IChatMessage & { _id?: { toString(): string } }) => ({
        id: m._id?.toString() || '',
        role: m.role,
        content: m.content,
        module: m.module,
        metadata: m.metadata,
        timestamp: m.timestamp,
      })),
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ sessions: formatted });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ sessions: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await connectDB();
    await ChatSession.deleteOne({
      sessionId,
      userId: currentUser._id.toString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
