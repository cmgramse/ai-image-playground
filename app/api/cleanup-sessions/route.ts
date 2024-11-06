import { getRequestContext } from '@cloudflare/next-on-pages';

// Add this line to specify Edge Runtime
export const runtime = 'edge';

// Session TTL in milliseconds (e.g., 24 hours)
const SESSION_TTL = 24 * 60 * 60 * 1000;

export async function POST() {
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
    const now = Date.now();
    const { keys } = await sessionStore.list();

    for (const key of keys) {
      const sessionData = await sessionStore.get(key.name);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (now - session.lastAccessed > SESSION_TTL) {
          await sessionStore.delete(key.name);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Session cleanup completed'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to cleanup sessions'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 