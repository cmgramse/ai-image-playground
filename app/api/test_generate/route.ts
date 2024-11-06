import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const ctx = getRequestContext();
  if (!ctx) {
    return new Response('Request context not available', { status: 500 });
  }
  
  const ai = ctx.env.AI;
  if (!ai) {
    return new Response('AI environment not available', { status: 500 });
  }
  
  const { prompt, model } = await request.json<{ prompt: string, model: string }>();

  console.log("Test endpoint received prompt:", prompt);
  console.log("Using model:", model);

  const inputs = { prompt };
  const response = await ai.run(model, inputs);
  
  console.log("Image generation successful");
  
  return new Response(`data:image/png;base64,${response.image}`, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
} 