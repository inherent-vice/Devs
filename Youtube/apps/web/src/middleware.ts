import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================
// API Authentication Middleware
// ===========================================

/**
 * Session token configuration
 */
const SESSION_CONFIG = {
  /** Session token max age in milliseconds (24 hours) */
  MAX_AGE_MS: 24 * 60 * 60 * 1000,
  /** Token prefix for validation */
  TOKEN_PREFIX: 'yt_sess_',
  /** Minimum token length */
  MIN_TOKEN_LENGTH: 32,
};

/**
 * Protected API routes that require authentication
 */
const PROTECTED_API_ROUTES = [
  '/api/workflow',
  '/api/sessions',
  '/api/generate',
];

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/status',
  '/api/preview', // Voice preview is public
];

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only check API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Public routes pass through
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = PROTECTED_API_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Skip auth in development with SKIP_AUTH flag
  if (process.env.NODE_ENV === 'development' &&
      process.env.SKIP_AUTH === 'true') {
    return NextResponse.next();
  }

  // Authentication method 1: API Key header
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.API_KEY) {
    return NextResponse.next();
  }

  // Authentication method 2: Session cookie
  const sessionToken = request.cookies.get('session-token');
  if (sessionToken && isValidSession(sessionToken.value)) {
    return NextResponse.next();
  }

  // Authentication method 3: Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (isValidToken(token)) {
      return NextResponse.next();
    }
  }

  // Authentication failed
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid authentication required',
    },
    { status: 401 }
  );
}

/**
 * Session token structure:
 * Format: yt_sess_{userId}_{timestamp}_{signature}
 * Example: yt_sess_user123_1704067200000_abc123def456
 */
interface ParsedSessionToken {
  userId: string;
  timestamp: number;
  signature: string;
}

/**
 * Parse and validate session token format
 */
function parseSessionToken(token: string): ParsedSessionToken | null {
  if (!token || token.length < SESSION_CONFIG.MIN_TOKEN_LENGTH) {
    return null;
  }

  if (!token.startsWith(SESSION_CONFIG.TOKEN_PREFIX)) {
    return null;
  }

  const parts = token.slice(SESSION_CONFIG.TOKEN_PREFIX.length).split('_');
  if (parts.length < 3) {
    return null;
  }

  const userId = parts[0];
  const timestamp = parseInt(parts[1], 10);
  const signature = parts.slice(2).join('_');

  if (!userId || isNaN(timestamp) || !signature) {
    return null;
  }

  return { userId, timestamp, signature };
}

/**
 * Validate session token
 * Checks format, expiration, and basic signature validation
 */
function isValidSession(token: string): boolean {
  const parsed = parseSessionToken(token);
  if (!parsed) {
    return false;
  }

  // Check if token is expired
  const now = Date.now();
  if (now - parsed.timestamp > SESSION_CONFIG.MAX_AGE_MS) {
    return false;
  }

  // Check if timestamp is not in the future (clock skew tolerance: 5 min)
  if (parsed.timestamp > now + 5 * 60 * 1000) {
    return false;
  }

  // Validate signature using HMAC-like verification
  // In production, use crypto.subtle.verify with proper key management
  const expectedSignature = generateSignature(parsed.userId, parsed.timestamp);
  if (parsed.signature !== expectedSignature) {
    // Fallback: If no secret is configured, accept any valid format
    if (!process.env.SESSION_SECRET) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Generate signature for session token
 * Uses a simple hash for edge runtime compatibility
 */
function generateSignature(userId: string, timestamp: number): string {
  const secret = process.env.SESSION_SECRET || 'default-dev-secret';
  const data = `${userId}:${timestamp}:${secret}`;

  // Simple hash for edge runtime (not cryptographically secure for production)
  // In production, use Web Crypto API: crypto.subtle.sign
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * Validate bearer token (JWT or API key)
 */
function isValidToken(token: string): boolean {
  // Method 1: Direct API key comparison
  if (token === process.env.API_KEY) {
    return true;
  }

  // Method 2: JWT validation (basic structure check)
  // Full JWT validation would use jose or similar library
  if (isValidJwtFormat(token)) {
    return validateJwtToken(token);
  }

  return false;
}

/**
 * Check if token has valid JWT format (header.payload.signature)
 */
function isValidJwtFormat(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Check if each part is valid base64url
  return parts.every(part => {
    try {
      // Base64url decode attempt
      const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      return decoded.length > 0;
    } catch {
      return false;
    }
  });
}

/**
 * Validate JWT token payload
 */
function validateJwtToken(token: string): boolean {
  try {
    const parts = token.split('.');
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64));

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }

    // Check not before
    if (payload.nbf && payload.nbf * 1000 > Date.now()) {
      return false;
    }

    // Check issuer if configured
    if (process.env.JWT_ISSUER && payload.iss !== process.env.JWT_ISSUER) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
