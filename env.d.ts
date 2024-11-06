interface GatewayConfig {
  gateway: {
    id: string;
    skipCache?: boolean;
    cacheTtl?: number;
  }
}

interface CloudflareAI {
  run(model: string, inputs: { prompt: string }, gateway?: GatewayConfig): Promise<{ image: string }>;
}

interface CloudflareEnv {
  AI: CloudflareAI;
  image_generation_sessions: KVNamespace;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

interface RequestContext {
  env: CloudflareEnv;
}

declare module "@cloudflare/next-on-pages" {
  export function getRequestContext(): RequestContext | undefined;
}
