import { guardRequest } from '../lib/security.js';

export default async function handler(req, res) {
  const identity = await guardRequest(req, res, { auth: false, route: 'auth-config' });
  if (!identity) return;
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  const publishableKey = String(process.env.CLERK_PUBLISHABLE_KEY || '').trim();
  if (!publishableKey) return res.status(503).json({ success: false, error: 'AUTH_NOT_CONFIGURED' });
  return res.status(200).json({ publishableKey });
}
