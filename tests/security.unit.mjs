import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { guardRequest } from '../lib/security.js';

process.env.CLERK_ISSUER = 'https://clerk.example.test';
process.env.CLERK_JWKS_URL = 'https://clerk.example.test/.well-known/jwks.json';
process.env.ALLOWED_ORIGINS = 'https://preview.example.test';
process.env.CLERK_AUTHORIZED_PARTIES = 'https://preview.example.test';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
jwk.kid = 'test-key';
jwk.alg = 'RS256';
jwk.use = 'sig';

const b64url = (value) => Buffer.from(value).toString('base64url');
function token({ expired = false } = {}) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test-key' }));
  const payload = b64url(JSON.stringify({
    iss: process.env.CLERK_ISSUER,
    sub: 'user_test_123',
    azp: 'https://preview.example.test',
    exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 600),
    metadata: { role: 'user' },
  }));
  const input = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  return `${input}.${signer.sign(privateKey).toString('base64url')}`;
}

const makeRes = () => ({ headers: {}, statusCode: 200, body: null, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { this.ended = true; return this; }, headersSent: false });
const originalFetch = global.fetch;

try {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  global.fetch = async (url) => {
    if (String(url).includes('jwks')) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
  };

  {
    const req = { method: 'GET', headers: { origin: 'https://preview.example.test' } };
    const res = makeRes();
    const result = await guardRequest(req, res, { route: 'analyze' });
    assert.equal(result, null, 'missing authentication must be rejected');
    assert.equal(res.statusCode, 401);
  }

  {
    const req = { method: 'GET', headers: { origin: 'https://preview.example.test', authorization: `Bearer ${token()}` } };
    const res = makeRes();
    const result = await guardRequest(req, res, { route: 'analyze' });
    assert.equal(result.userId, 'user_test_123', 'valid Clerk JWT must authenticate server-side');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://preview.example.test');
  }

  {
    const req = { method: 'GET', headers: { origin: 'https://preview.example.test', authorization: `Bearer ${token({ expired: true })}` } };
    const res = makeRes();
    const result = await guardRequest(req, res, { route: 'analyze' });
    assert.equal(result, null);
    assert.equal(res.statusCode, 401);
  }

  {
    global.fetch = async (url) => {
      if (String(url).includes('jwks')) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
      if (String(url).includes('/set/')) return new Response(JSON.stringify({ result: null }), { status: 200 });
      return new Response(JSON.stringify({ result: 31 }), { status: 200 });
    };
    const req = { method: 'GET', headers: { origin: 'https://preview.example.test', authorization: `Bearer ${token()}` } };
    const res = makeRes();
    const result = await guardRequest(req, res, { route: 'analyze' });
    assert.equal(result, null);
    assert.equal(res.statusCode, 429);
    assert.ok(Number(res.headers['Retry-After']) > 0);
  }

  {
    const req = { method: 'GET', headers: { origin: 'https://evil.example.test', authorization: `Bearer ${token()}` } };
    const res = makeRes();
    const result = await guardRequest(req, res, { route: 'analyze' });
    assert.equal(result, null);
    assert.equal(res.statusCode, 403);
  }

  console.log('security.unit: PASS');
} finally {
  global.fetch = originalFetch;
}
