import crypto from 'node:crypto';

const jwksCache = new Map();
const JWKS_TTL_MS = 10 * 60 * 1000;
const RATE_POLICIES = {
  health: { limit: 60, window: 60 },
  normal: { limit: 30, window: 60 },
  expensive: { limit: 10, window: 60 },
  research: { limit: 10, window: 60 },
};
const csv = (value) => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
const allowedOrigins = () => csv(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN);

function applyCors(req, res) {
  const origin = req.headers?.origin;
  const allowed = allowedOrigins();
  if (origin && !allowed.includes(origin)) {
    res.status(403).json({ success: false, error: 'ORIGIN_NOT_ALLOWED' });
    return false;
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-ID');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Cache-Control', 'no-store');
  return true;
}

function b64(input) {
  const normalized = String(input).replaceAll('-', '+').replaceAll('_', '/');
  return Buffer.from(normalized + '='.repeat((4 - (normalized.length % 4)) % 4), 'base64');
}

function decodeJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('invalid token');
  return {
    header: JSON.parse(b64(parts[0]).toString('utf8')),
    payload: JSON.parse(b64(parts[1]).toString('utf8')),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: b64(parts[2]),
  };
}

async function getJwks() {
  const url = String(process.env.CLERK_JWKS_URL || '').trim();
  if (!url) throw new Error('CLERK_JWKS_URL is not configured');
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error('identity key service unavailable');
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error('invalid identity key set');
  jwksCache.set(url, { keys: body.keys, expiresAt: Date.now() + JWKS_TTL_MS });
  return body.keys;
}

function roleFromClaims(payload) {
  return payload?.metadata?.role || payload?.public_metadata?.role || payload?.unsafe_metadata?.role || payload?.role || null;
}

function roleAllowed(payload, requiredRole) {
  if (!requiredRole) return true;
  const role = String(roleFromClaims(payload) || '').toLowerCase();
  if (requiredRole === 'admin') return role === 'admin' || csv(process.env.CLERK_ADMIN_USER_IDS).includes(payload.sub);
  if (requiredRole === 'research') {
    return ['admin', 'research'].includes(role)
      || csv(process.env.CLERK_ADMIN_USER_IDS).includes(payload.sub)
      || csv(process.env.CLERK_RESEARCH_USER_IDS).includes(payload.sub);
  }
  return false;
}

export async function authenticateRequest(req) {
  const authorization = String(req.headers?.authorization || '');
  if (!authorization.startsWith('Bearer ')) return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  const token = authorization.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  try {
    const { header, payload, signingInput, signature } = decodeJwt(token);
    if (header.alg !== 'RS256' || !header.kid) throw new Error('unsupported token');
    const issuer = String(process.env.CLERK_ISSUER || '').trim();
    if (!issuer || payload.iss !== issuer) throw new Error('issuer mismatch');
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.exp || payload.exp <= now || (payload.nbf && payload.nbf > now + 5)) throw new Error('token time invalid');
    const audiences = csv(process.env.CLERK_AUDIENCE);
    if (audiences.length && (!payload.aud || !audiences.includes(payload.aud))) throw new Error('audience mismatch');
    const authorizedParties = csv(process.env.CLERK_AUTHORIZED_PARTIES || process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN);
    if (authorizedParties.length && payload.azp && !authorizedParties.includes(payload.azp)) throw new Error('authorized party mismatch');
    const keys = await getJwks();
    const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) throw new Error('unknown signing key');
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signingInput);
    verifier.end();
    if (!verifier.verify(publicKey, signature)) throw new Error('invalid signature');
    return { ok: true, userId: payload.sub, claims: payload, role: roleFromClaims(payload) };
  } catch (error) {
    console.warn('[auth] rejected request', { message: error?.message });
    return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  }
}

function clientIp(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || 'unknown');
}

async function redisCommand(command, args = []) {
  let url = String(process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  if (!url || !token) throw new Error('rate-limit infrastructure not configured');
  if (url.endsWith('/')) url = url.slice(0, -1);
  const path = [command, ...args].map((v) => encodeURIComponent(String(v))).join('/');
  const response = await fetch(`${url}/${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('rate-limit infrastructure unavailable');
  return response.json();
}

export async function enforceRateLimit(req, res, { key, policy = 'normal' } = {}) {
  const selected = RATE_POLICIES[policy] || RATE_POLICIES.normal;
  const bucket = Math.floor(Date.now() / (selected.window * 1000));
  const safeKey = crypto.createHash('sha256').update(`${key}:${bucket}`).digest('hex');
  const redisKey = `stocksamjho:rl:${safeKey}`;
  const first = await redisCommand('set', [redisKey, '1', 'ex', String(selected.window), 'nx']);
  const count = first?.result === 'OK' ? 1 : Number((await redisCommand('incr', [redisKey]))?.result || 0);
  const remaining = Math.max(0, selected.limit - count);
  const reset = (bucket + 1) * selected.window;
  res.setHeader('X-RateLimit-Limit', String(selected.limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(reset));
  if (count > selected.limit) {
    const retryAfter = Math.max(1, reset - Math.floor(Date.now() / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ success: false, error: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' });
    return false;
  }
  return true;
}

export async function guardRequest(req, res, { auth = true, role = null, policy = 'normal', route = 'api' } = {}) {
  if (!applyCors(req, res)) return null;
  if (req.method === 'OPTIONS') { res.status(204).end(); return null; }
  if (auth) {
    const identity = await authenticateRequest(req);
    if (!identity.ok) { res.status(identity.status).json({ success: false, error: identity.error }); return null; }
    if (!roleAllowed(identity.claims, role)) { res.status(403).json({ success: false, error: 'FORBIDDEN' }); return null; }
    if (!(await enforceRateLimit(req, res, { key: `user:${identity.userId}:${route}`, policy }))) return null;
    return identity;
  }
  if (!(await enforceRateLimit(req, res, { key: `ip:${clientIp(req)}:${route}`, policy: 'health' }))) return null;
  return { public: true };
}
