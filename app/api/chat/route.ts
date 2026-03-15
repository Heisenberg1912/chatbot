import { NextRequest, NextResponse } from 'next/server';
import { generateChat, generateVisionContent, generateText } from '@/lib/gemini';
import { connectDB } from '@/lib/mongodb';
import { ChatSession, Usage, Media } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { analyzeSiteImage, formatAnalysisForChat } from '@/lib/modules/site-analyzer';
import { generateFloorPlan, formatFloorPlanForChat } from '@/lib/modules/floorplan-generator';
import {
  analyzeCity,
  formatMasterplanForChat,
  CITY_SEEDS,
} from '@/lib/modules/masterplan-engine';
import { recommendMaterials, searchSuppliers, formatSuppliersForChat } from '@/lib/modules/material-finder';

const FREE_LIMIT = 5;

const SYSTEM_PROMPT = `You are BuildBot AI, a comprehensive construction and real estate assistant.
You combine the capabilities of multiple specialized tools:

1. Site Analyzer (Valuator/Vision) - Analyze construction site images for valuation, progress tracking, and risk assessment.
2. Floor Plan Generator (VitruviAI) - Generate 2D architectural floor plans from text descriptions.
3. Masterplan Explorer (Faust) - Analyze city masterplans, identify development hotspots, and discover leads across 40+ global cities.
4. Material Finder (Material Studio) - Find construction material suppliers, get recommendations, and compare options.

When users ask questions, determine which module is most relevant and use it.
For general construction/real estate questions, answer directly with your expertise.

IMPORTANT FORMATTING RULES:
- Do NOT use emojis in your responses. Keep text clean and professional.
- Use markdown headers (## and ###) for section titles.
- Use bullet points with dashes (-) for lists.
- Use **bold** only for key terms or numbers, not excessively.
- Keep responses concise and well-structured.
- Write in a professional, architectural tone.
- Do not add unnecessary filler text or repetitive summaries.`;

interface ChatRequest {
  message: string;
  sessionId: string;
  module?: string;
  image?: string;
  imageMimeType?: string;
  location?: string;
  currency?: string;
}

function detectModule(message: string, hasImage: boolean): string {
  const lower = message.toLowerCase();

  if (hasImage) return 'site-analyzer';

  // Floor plan keywords
  if (
    /floor\s*plan|layout|blueprint|room\s*design|house\s*plan|apartment\s*layout|bhk|architect/i.test(
      lower
    )
  )
    return 'floorplan';

  // Masterplan/city keywords
  if (
    /masterplan|hotspot|lead\s*discover|city\s*analysis|real\s*estate\s*market|investment\s*opportunit/i.test(
      lower
    )
  )
    return 'masterplan';

  // Check if a known city is mentioned with market context
  const cityMatch = CITY_SEEDS.find((c) => lower.includes(c.name.toLowerCase()));
  if (cityMatch && /market|invest|develop|opportunit|growth|property|land/i.test(lower))
    return 'masterplan';

  // Material/supplier keywords
  if (
    /material|supplier|vendor|cement|steel|brick|tile|plumb|electric|hardware|paint|sand|aggregate/i.test(
      lower
    )
  )
    return 'materials';

  // Site analysis keywords without image
  if (
    /valuat|construction\s*progress|site\s*analysis|property\s*value|land\s*value/i.test(lower)
  )
    return 'site-analyzer';

  return 'general';
}

async function handleModuleRequest(
  module: string,
  message: string,
  image?: string,
  imageMimeType?: string,
  location?: string,
  currency?: string
): Promise<{ response: string; metadata?: Record<string, unknown> }> {
  switch (module) {
    case 'site-analyzer': {
      if (image && imageMimeType) {
        try {
          const result = await analyzeSiteImage(image, imageMimeType, location, currency);
          return {
            response: formatAnalysisForChat(result),
            metadata: { type: 'site-analysis', data: result },
          };
        } catch (err) {
          // Fallback to raw vision
          const text = await generateVisionContent(
            `Analyze this construction site image. ${message}`,
            image,
            imageMimeType,
            SYSTEM_PROMPT
          );
          return { response: text };
        }
      }
      const text = await generateText(
        `${SYSTEM_PROMPT}\n\nUser question about site analysis: ${message}`,
        SYSTEM_PROMPT
      );
      return { response: text };
    }

    case 'floorplan': {
      try {
        const plan = await generateFloorPlan(message);
        return {
          response: formatFloorPlanForChat(plan),
          metadata: { type: 'floorplan', data: plan },
        };
      } catch {
        const text = await generateText(
          `Generate a textual floor plan description for: ${message}`,
          SYSTEM_PROMPT
        );
        return { response: text };
      }
    }

    case 'masterplan': {
      const cityMatch = CITY_SEEDS.find((c) =>
        message.toLowerCase().includes(c.name.toLowerCase())
      );
      if (cityMatch) {
        try {
          const analysis = await analyzeCity(cityMatch.name);
          return {
            response: formatMasterplanForChat(analysis),
            metadata: { type: 'masterplan', data: analysis },
          };
        } catch {
          const text = await generateText(message, SYSTEM_PROMPT);
          return { response: text };
        }
      }
      const text = await generateText(message, SYSTEM_PROMPT);
      return { response: text };
    }

    case 'materials': {
      // Try supplier DB search first, fallback to AI recommendation
      try {
        const supplierMatch = message.match(
          /supplier|vendor|find|search|list/i
        );
        if (supplierMatch) {
          const cityMatch = CITY_SEEDS.find((c) =>
            message.toLowerCase().includes(c.name.toLowerCase())
          );
          const categoryMatch = message.match(
            /plumb|electric|hardware|structur|finish|machine|fabric|interior/i
          );

          const result = await searchSuppliers({
            city: cityMatch?.name,
            category: categoryMatch?.[0],
            query: message,
          });

          if (result.total > 0) {
            return {
              response: formatSuppliersForChat(
                result.suppliers as unknown as Array<Record<string, unknown>>,
                result.total
              ),
              metadata: { type: 'suppliers', data: result },
            };
          }
        }
      } catch {
        // DB unavailable, fall through to AI recommendation
      }

      // Material recommendation via AI
      const text = await recommendMaterials(
        message,
        'General',
        undefined
      );
      return { response: text };
    }

    default: {
      const text = await generateText(message, SYSTEM_PROMPT);
      return { response: text };
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, sessionId, image, imageMimeType, location, currency } = body;

    if (!message && !image) {
      return NextResponse.json({ error: 'Message or image is required' }, { status: 400 });
    }

    // Validate image if provided
    if (image) {
      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (imageMimeType && !ALLOWED_MIME_TYPES.includes(imageMimeType)) {
        return NextResponse.json({ error: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 });
      }
      // Reject images larger than 5MB (base64 is ~33% larger than raw)
      const MAX_BASE64_SIZE = 7 * 1024 * 1024; // ~5MB raw
      if (image.length > MAX_BASE64_SIZE) {
        return NextResponse.json({ error: 'Image too large. Maximum size is 5MB.' }, { status: 400 });
      }
    }

    // Detect which module to use
    const module = body.module || detectModule(message || '', !!image);

    // Check usage limits
    await connectDB();
    const currentUser = await getCurrentUser();
    const isPro =
      currentUser?.subscription?.plan === 'pro' ||
      currentUser?.subscription?.plan === 'enterprise';
    const isNotExpired =
      !currentUser?.subscription?.endDate ||
      new Date(currentUser.subscription.endDate) > new Date();
    const isActivePro =
      isPro &&
      currentUser?.subscription?.status === 'active' &&
      isNotExpired;

    if (!isActivePro) {
      const usageKey = currentUser ? currentUser._id.toString() : sessionId;
      const usage = await Usage.findOne({ key: usageKey, module });
      if (usage && usage.freeUsed >= FREE_LIMIT) {
        return NextResponse.json(
          {
            error: 'You have reached your free limit for this module. Upgrade to Pro for unlimited access.',
            limitReached: true,
            module,
          },
          { status: 403 }
        );
      }
    }

    // Process the request
    const { response, metadata } = await handleModuleRequest(
      module,
      message || 'Analyze this image',
      image,
      imageMimeType,
      location,
      currency
    );

    // Save to chat history
    try {
      await connectDB();
      await ChatSession.findOneAndUpdate(
        { sessionId },
        {
          $push: {
            messages: {
              $each: [
                {
                  role: 'user' as const,
                  content: message || '[Image uploaded]',
                  images: image ? ['[base64]'] : undefined,
                  module,
                  timestamp: new Date(),
                },
                {
                  role: 'assistant' as const,
                  content: response,
                  module,
                  metadata,
                  timestamp: new Date(),
                },
              ],
            },
          },
          $setOnInsert: {
            sessionId,
            title: (message || 'Image Analysis').slice(0, 50),
            module,
            ...(currentUser && { userId: currentUser._id.toString() }),
          },
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.warn('Failed to save chat history:', dbErr);
    }

    // Auto-save generated media for logged-in users
    if (currentUser) {
      try {
        if (metadata?.type === 'floorplan') {
          const planData = metadata.data as Record<string, unknown>;
          if (planData?.floorPlanImage) {
            await Media.create({
              userId: currentUser._id.toString(),
              src: planData.floorPlanImage as string,
              title: (planData.title as string) || `Floor Plan: ${(message || '').slice(0, 40)}`,
              module: 'Floor Plans',
            });
          }
        } else if (image && module === 'site-analyzer') {
          // Save uploaded site analysis images
          await Media.create({
            userId: currentUser._id.toString(),
            src: `data:${imageMimeType || 'image/jpeg'};base64,${image}`,
            title: `Site Analysis: ${(message || 'Image').slice(0, 40)}`,
            module: 'Site Analyzer',
          });
        }
      } catch (mediaErr) {
        console.warn('Failed to auto-save media:', mediaErr);
      }
    }

    // Increment usage for free users
    if (!isActivePro) {
      try {
        const usageKey = currentUser ? currentUser._id.toString() : sessionId;
        await Usage.findOneAndUpdate(
          { key: usageKey, module },
          { $inc: { freeUsed: 1 } },
          { upsert: true, new: true }
        );
      } catch (usageErr) {
        console.warn('Failed to increment usage:', usageErr);
      }
    }

    return NextResponse.json({
      response,
      module,
      metadata,
      sessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}
