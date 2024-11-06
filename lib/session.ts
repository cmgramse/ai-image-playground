export interface Session {
  id: string;
  createdAt: number;
  lastAccessed: number;
  generatedImages: string[];
}

export class SessionManager {
  private static SESSION_KEY = 'ai_image_session';

  static generateSessionId(): string {
    return crypto.randomUUID();
  }

  static getSessionFromBrowser(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.SESSION_KEY);
  }

  static setSessionInBrowser(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SESSION_KEY, sessionId);
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_KEY);
  }

  static createNewSession(): string {
    const sessionId = this.generateSessionId();
    this.setSessionInBrowser(sessionId);
    return sessionId;
  }

  static async refreshSession(): Promise<string> {
    // First clear the browser session
    this.clearSession();
    
    // Create new session ID
    const newSessionId = this.createNewSession();
    
    // Call the API to clear the old session data
    try {
      await fetch('/api/refresh-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: newSessionId }),
      });
    } catch (error) {
      console.error('Failed to refresh session on server:', error);
    }

    return newSessionId;
  }
} 