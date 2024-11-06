import { getRequestContext } from '@cloudflare/next-on-pages';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

interface RefreshSessionRequest {
  sessionId: string;
}

export async function POST(request: NextRequest) {
  const ctx = getRequestContext();
  const sessionStore = ctx?.env?.image_generation_sessions;

  if (!sessionStore) {
    return new Response(JSON.stringify({
      error: 'Session store not available'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    // Type guard to ensure body has sessionId
    if (!body || typeof body !== 'object' || !('sessionId' in body) || typeof body.sessionId !== 'string') {
      throw new Error('Invalid request body: missing or invalid sessionId');
    }
    
    const { sessionId } = body as RefreshSessionRequest;
    
    // Create a fresh session
    const newSession = {
      id: sessionId,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      generatedImages: []
    };

    await sessionStore.put(sessionId, JSON.stringify(newSession));

    return new Response(JSON.stringify({
      success: true,
      message: 'Session refreshed successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to refresh session'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 