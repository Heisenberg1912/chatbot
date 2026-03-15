import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Media } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';

// GET /api/media — fetch user's media
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const tab = req.nextUrl.searchParams.get('tab') || 'created';
    const filter: Record<string, unknown> = { userId: user._id.toString() };
    if (tab === 'saved') {
      filter.saved = true;
    }

    const media = await Media.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Media fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

// POST /api/media — save a new media item
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { src, title, module } = await req.json();
    if (!src || !title) {
      return NextResponse.json({ error: 'src and title are required' }, { status: 400 });
    }

    await connectDB();

    const media = await Media.create({
      userId: user._id.toString(),
      src,
      title,
      module: module || 'general',
      saved: false,
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    console.error('Media save error:', error);
    return NextResponse.json({ error: 'Failed to save media' }, { status: 500 });
  }
}

// PATCH /api/media — toggle saved status
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, saved } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    await connectDB();
    const media = await Media.findOneAndUpdate(
      { _id: id, userId: user._id.toString() },
      { saved: !!saved },
      { new: true }
    );

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Media update error:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

// DELETE /api/media?id=xxx — delete a media item
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    await connectDB();
    await Media.deleteOne({ _id: id, userId: user._id.toString() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}
