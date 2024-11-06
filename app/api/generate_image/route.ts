// a next.js route that handles a JSON post request with prompt and model
// and calls the Cloudflare Workers AI model

import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { selectPromptElements, optimizeWithElements, fastAutotune } from './autotune'

export const runtime = 'edge'

interface RequestBody {
  prompt: string;
  autotuneMode: 'manual' | 'fast' | 'v2';
  model?: string;
}

interface SessionData {
  id: string;
  createdAt: number;
  lastAccessed: number;
  generatedImages: string[];
}

export async function POST(request: NextRequest) {
  const ctx = getRequestContext();
  const ai = ctx?.env?.AI;
  const sessionStore = ctx?.env?.image_generation_sessions;

  if (!ai) {
    return new Response(JSON.stringify({ error: 'AI service not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!sessionStore) {
    return new Response(JSON.stringify({ error: 'Session store not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sessionId = request.headers.get('X-Session-ID');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'No session ID provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get session data
    let sessionData: SessionData;
    const existingSession = await sessionStore.get(sessionId);
    sessionData = existingSession ? JSON.parse(existingSession) : {
      id: sessionId,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      generatedImages: []
    };
    sessionData.lastAccessed = Date.now();

    // Parse request body
    const { prompt, autotuneMode = 'manual', model = '@cf/black-forest-labs/flux-1-schnell' } = await request.json() as RequestBody;

    // Handle prompt optimization
    let optimizedPrompt = prompt;
    let optimizationStatus = 'none';
    let errorMessage = '';

    if (autotuneMode === 'v2') {
      try {
        const selectedElements = await selectPromptElements(ai, prompt);
        if (selectedElements) {
          const optimized = await optimizeWithElements(ai, prompt, selectedElements);
          if (optimized) {
            optimizedPrompt = optimized;
            optimizationStatus = 'success';
          }
        }
      } catch (error) {
        optimizationStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      }
    } else if (autotuneMode === 'fast') {
      try {
        const optimized = await fastAutotune(ai, prompt);
        if (optimized) {
          optimizedPrompt = optimized;
          optimizationStatus = 'success';
        }
      } catch (error) {
        optimizationStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : 'Fast optimization failed';
      }
    }

    // Generate image
    const inputs = { prompt: optimizedPrompt };
    const response = await ai.run(model, inputs);

    // Update session with new image
    sessionData.generatedImages.push(response.image);
    await sessionStore.put(sessionId, JSON.stringify(sessionData));

    // Return response
    return new Response(`data:image/png;base64,${response.image}`, {
      headers: {
        'Content-Type': 'image/png',
        'X-Optimized-Prompt': encodeURIComponent(optimizedPrompt),
        'X-Optimization-Status': optimizationStatus,
        'X-Error-Message': errorMessage
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to generate image'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
