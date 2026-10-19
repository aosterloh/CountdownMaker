import { getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * API Authentication & Interceptor Utility
 * Automatically injects a fresh Google SSO / Firebase ID token into all requests to /api/*.
 * Catches 401/403 Unauthorized responses to trigger clean session re-authentication.
 */

export function initAuthFetchInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof (input as Request).url === 'string') {
      url = (input as Request).url;
    }

    let token: string | null = null;
    if (url.includes('/api/')) {
      // 1. Prefer fresh ID token directly from active Firebase Auth session
      try {
        if (getApps().length > 0) {
          const auth = getAuth();
          // If auth is still initializing from storage/cookies, await authStateReady
          if (!auth.currentUser && typeof auth.authStateReady === 'function') {
            await auth.authStateReady();
          }
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
            if (token) {
              localStorage.setItem('auth_token', token);
            }
          }
        }
      } catch (err) {
        console.warn('[apiAuth] Error retrieving fresh auth token:', err);
      }

      if (!token) {
        token = localStorage.getItem('auth_token');
      }
    }

    let modifiedInit = init;
    if (token && url.includes('/api/')) {
      modifiedInit = modifiedInit ? { ...modifiedInit } : {};
      const headers = new Headers(modifiedInit.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      modifiedInit.headers = headers;
    }

    const response = await originalFetch(input, modifiedInit);

    // If an authenticated endpoint returns 401/403 with expired or invalid session, notify the application
    if ((response.status === 401 || response.status === 403) && url.includes('/api/') && !url.includes('/api/auth/')) {
      const cloned = response.clone();
      cloned
        .json()
        .then(async (data) => {
          const err = (data?.error || '').toLowerCase();
          const isTokenInvalid =
            err.includes('invalid') ||
            err.includes('unauthorized') ||
            err.includes('expired') ||
            err.includes('access restricted') ||
            err.includes('token');

          if (isTokenInvalid) {
            // Check if Firebase currentUser exists and can refresh token before logging out
            try {
              if (getApps().length > 0) {
                const auth = getAuth();
                if (auth.currentUser) {
                  const freshToken = await auth.currentUser.getIdToken(true);
                  if (freshToken) {
                    localStorage.setItem('auth_token', freshToken);
                    console.log('[Auth] Refreshed token after 401');
                    return;
                  }
                }
              }
            } catch {
              // Refresh failed, proceed to logout
            }

            console.warn('[Auth] Session invalidated or token expired:', data.error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.dispatchEvent(new CustomEvent('auth-expired', { detail: data.error }));
          }
        })
        .catch(() => {});
    }

    return response;
  };
}
