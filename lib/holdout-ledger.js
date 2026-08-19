const URL_ENV_NAMES = ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'];
const TOKEN_ENV_NAMES = ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN'];

function envFirst(names) { return names.map(n => process.env[n]).find(Boolean) || null; }
function config() {
  const url = envFirst(URL_ENV_NAMES);
  const token = envFirst(TOKEN_ENV_NAMES);
  if (!url || !token) throw new Error('HOLDOUT_LEDGER_NOT_CONFIGURED');
  return { url: url.replace(/\/$/, ''), token };
}

async function command(parts) {
  const { url, token } = config();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`HOLDOUT_LEDGER_HTTP_${r.status}`);
  const body = await r.json();
  return body?.result;
}

export async function getLedger(key) { return command(['GET', key]); }
export async function setLedger(key, value) { return command(['SET', key, value]); }
export async function claimExactlyOnce(key, payload) {
  // Redis SET NX is atomic across Vercel/serverless instances.
  const result = await command(['SET', key, JSON.stringify(payload), 'NX']);
  return result === 'OK';
}

export async function durableHoldoutState(protocolId) {
  return getLedger(`stocksamjho:holdout:${protocolId}:state`);
}

export async function claimHoldoutOnce(protocolId, metadata) {
  return claimExactlyOnce(`stocksamjho:holdout:${protocolId}:state`, {
    status: 'RUNNING',
    protocolId,
    claimedAt: new Date().toISOString(),
    metadata,
  });
}

export async function completeHoldoutOnce(protocolId, result) {
  return setLedger(`stocksamjho:holdout:${protocolId}:state`, JSON.stringify({
    status: 'COMPLETED',
    protocolId,
    completedAt: new Date().toISOString(),
    result,
  }));
}
