import { NextRequest, NextResponse } from 'next/server';
import { generateChat, generateVisionContent, generateText } from '@/lib/gemini';
import { IChatMessage } from '@/lib/models';
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

const SYSTEM_PROMPT = `You are Builtattic AI, an end-to-end construction and real estate intelligence engine designed to assist developers, architects, contractors, and investors across the entire building lifecycle.

You combine advanced capabilities across multiple specialized modules, each solving a high-value problem within the built environment.

## Core Intelligence Modules

### Site Intelligence Engine (Vision + Valuation)
Analyze real-world construction data through images and contextual inputs.
- Evaluate site conditions, structural progress, and build quality
- Estimate project valuation based on stage, materials, and geography
- Detect risks, delays, and inefficiencies early
- Provide progress tracking insights for developers and stakeholders

### Spatial Design Engine (Generative Planning)
Transform intent into buildable spatial layouts.
- Generate 2D floor plans from natural language inputs
- Optimize layouts for functionality, Vastu, ventilation, and efficiency
- Adapt designs based on plot size, constraints, and use case
- Support rapid iteration for architects and developers

### Urban Intelligence Engine (Masterplan + Growth Mapping)
Understand where cities are going before the market reacts.
- Analyze city masterplans and zoning regulations
- Identify high-growth corridors and development hotspots
- Surface land opportunities and early-stage investment zones
- Enable strategic expansion across 40+ global cities

### Material Intelligence Engine (Sourcing + Optimization)
Simplify procurement with intelligent recommendations.
- Discover verified material suppliers and vendors
- Compare options based on cost, durability, and availability
- Get recommendations tailored to project type and budget
- Optimize procurement for speed and cost efficiency

## Operating Principle
When a query is received:
1. Identify the intent layer: design, site, city, or materials
2. Activate the most relevant intelligence module
3. Deliver outputs that are practical, actionable, and build-ready

For general construction and real estate queries, respond with domain expertise grounded in real-world execution, not theory.

## Response Framework
- Use clear markdown structure with headers
- Keep responses concise, structured, and decision-oriented
- Prioritize clarity over verbosity
- Maintain a professional, architectural tone
- Avoid fluff, repetition, or generic advice
- Do NOT use emojis in your responses
- Use **bold** only for key terms or numbers, not excessively`;

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
  currency?: string,
  chatHistory?: Array<{ role: string; content: string }>
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
      // Follow-up question: use chat history for context
      if (chatHistory && chatHistory.length > 0) {
        const historyParts = chatHistory.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));
        const text = await generateChat(
          historyParts,
          message,
          SYSTEM_PROMPT
        );
        return { response: text };
      }
      const text = await generateText(message, SYSTEM_PROMPT);
      return { response: text };
    }

    case 'floorplan': {
      // Check if this is a follow-up question (not a new floor plan request)
      const isFloorPlanRequest = /generate|create|design|make|draw|build|plan for|layout for|bhk|bedroom|bathroom/i.test(message);
      if (isFloorPlanRequest) {
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
      // Follow-up question about a previous floor plan
      if (chatHistory && chatHistory.length > 0) {
        const historyParts = chatHistory.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));
        const text = await generateChat(historyParts, message, SYSTEM_PROMPT);
        return { response: text };
      }
      const floorText = await generateText(message, SYSTEM_PROMPT);
      return { response: floorText };
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
          // Fall through to chat with history
        }
      }
      // Follow-up or general masterplan question
      if (chatHistory && chatHistory.length > 0) {
        const historyParts = chatHistory.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));
        const text = await generateChat(historyParts, message, SYSTEM_PROMPT);
        return { response: text };
      }
      const mpText = await generateText(message, SYSTEM_PROMPT);
      return { response: mpText };
    }

    case 'materials': {
      // Try supplier DB search first
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
        // DB unavailable, fall through
      }

      // Follow-up question about materials
      if (chatHistory && chatHistory.length > 0) {
        const historyParts = chatHistory.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));
        const text = await generateChat(historyParts, message, SYSTEM_PROMPT);
        return { response: text };
      }

      // Fresh material recommendation
      const text = await recommendMaterials(
        message,
        'General',
        undefined
      );
      return { response: text };
    }

    default: {
      if (chatHistory && chatHistory.length > 0) {
        const historyParts = chatHistory.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));
        const text = await generateChat(historyParts, message, SYSTEM_PROMPT);
        return { response: text };
      }
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
      if (!currentUser) {
        return NextResponse.json(
          {
            error: 'Please sign in to continue using BuildBot AI.',
            requiresAuth: true,
            module,
          },
          { status: 401 }
        );
      }
      const usageKey = currentUser._id.toString();
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

    // Fetch chat history for follow-up context
    let chatHistory: Array<{ role: string; content: string }> = [];
    try {
      const existingSession = await ChatSession.findOne({ sessionId }).lean();
      if (existingSession?.messages?.length) {
        chatHistory = (existingSession.messages as IChatMessage[])
          .slice(-10) // Last 10 messages for context
          .map((m) => ({ role: m.role, content: m.content }));
      }
    } catch {
      // Continue without history
    }

    // Process the request
    const { response, metadata } = await handleModuleRequest(
      module,
      message || 'Analyze this image',
      image,
      imageMimeType,
      location,
      currency,
      chatHistory
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
    if (!isActivePro && currentUser) {
      try {
        const usageKey = currentUser._id.toString();
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
