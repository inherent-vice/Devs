import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================
// API Authentication Middleware (Secure Version)
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
  /** Clock skew tolerance in milliseconds (5 minutes) */
  CLOCK_SKEW_MS: 5 * 60 * 1000,
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
  '/api/env-status',
  '/api/estimate',
  '/api/preview', // Voice preview is public
];

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convert string to ArrayBuffer for crypto operations
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 */
async function generateHmacSignature(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    stringToArrayBuffer(data)
  );

  return arrayBufferToHex(signature);
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await generateHmacSignature(data, secret);
  return secureCompare(signature, expectedSignature);
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
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

  // SKIP_AUTH only allowed in development AND must be explicitly set
  // WARNING: Never enable in production
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.SKIP_AUTH === 'true'
  ) {
    console.warn('[Middleware] SKIP_AUTH is enabled - authentication bypassed');
    return NextResponse.next();
  }

  // In production, SESSION_SECRET is required
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('[Middleware] SESSION_SECRET is required in production');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Authentication method 1: API Key header (constant-time comparison)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && process.env.API_KEY && secureCompare(apiKey, process.env.API_KEY)) {
    return NextResponse.next();
  }

  // Authentication method 2: Session cookie
  const sessionToken = request.cookies.get('session-token');
  if (sessionToken) {
    const isValid = await isValidSession(sessionToken.value);
    if (isValid) {
      return NextResponse.next();
    }
  }

  // Authentication method 3: Bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const isValid = await isValidToken(token);
    if (isValid) {
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
 * Format: yt_sess_{userId}_{timestamp}_{hmacSignature}
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
 * Validate session token with HMAC-SHA256
 */
async function isValidSession(token: string): Promise<boolean> {
  const parsed = parseSessionToken(token);
  if (!parsed) {
    return false;
  }

  // Check if token is expired
  const now = Date.now();
  if (now - parsed.timestamp > SESSION_CONFIG.MAX_AGE_MS) {
    return false;
  }

  // Check if timestamp is not in the future (with clock skew tolerance)
  if (parsed.timestamp > now + SESSION_CONFIG.CLOCK_SKEW_MS) {
    return false;
  }

  // Get session secret - required for validation
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // In development without secret, log warning but reject
    console.warn('[Middleware] SESSION_SECRET not set - session validation disabled');
    return false;
  }

  // Verify HMAC signature
  const dataToSign = `${parsed.userId}:${parsed.timestamp}`;
  return verifyHmacSignature(dataToSign, parsed.signature, secret);
}

/**
 * Validate bearer token (API key or JWT)
 */
async function isValidToken(token: string): Promise<boolean> {
  // Method 1: Direct API key comparison (constant-time)
  if (process.env.API_KEY && secureCompare(token, process.env.API_KEY)) {
    return true;
  }

  // Method 2: JWT validation
  if (isValidJwtFormat(token)) {
    return await validateJwtToken(token);
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
      const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      return decoded.length > 0;
    } catch {
      return false;
    }
  });
}

/**
 * Validate JWT token with HMAC-SHA256 signature verification
 */
async function validateJwtToken(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    const headerPayload = `${parts[0]}.${parts[1]}`;
    const signature = parts[2];

    // Decode payload
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

    // Verify signature if secret is configured
    const secret = process.env.SESSION_SECRET;
    if (secret) {
      // Convert base64url signature to hex for comparison
      const signatureBytes = atob(signature.replace(/-/g, '+').replace(/_/g, '/'));
      const signatureHex = Array.from(signatureBytes)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');

      return verifyHmacSignature(headerPayload, signatureHex, secret);
    }

    // Without secret, only validate payload claims
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new session token (utility for API routes)
 */
export async function createSessionToken(userId: string): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('[Middleware] Cannot create session token without SESSION_SECRET');
    return null;
  }

  const timestamp = Date.now();
  const dataToSign = `${userId}:${timestamp}`;
  const signature = await generateHmacSignature(dataToSign, secret);

  return `${SESSION_CONFIG.TOKEN_PREFIX}${userId}_${timestamp}_${signature}`;
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: ['/api/:path*'],
};
