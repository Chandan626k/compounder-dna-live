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

// Classify ledger outages separately from permanent upstream rejections and
// frozen-artifact conflicts. A 4xx response cannot be fixed by blind retries.
export function classifyHoldoutLedgerFailure(error) {
  const message = String(error?.message || error || '');
  const httpStatusMatch = message.match(/HOLDOUT_LEDGER_HTTP_(\d{3})\b/);

  if (httpStatusMatch) {
    const upstreamStatus = Number(httpStatusMatch[1]);
    // 501/505 mean the upstream does not support the requested functionality/protocol;
    // repeating the same request cannot turn those permanent rejections into an outage retry.
    const retryable = upstreamStatus === 408
      || upstreamStatus === 425
      || upstreamStatus === 429
      || (upstreamStatus >= 500 && upstreamStatus <= 599 && upstreamStatus !== 501 && upstreamStatus !== 505);

    return {
      httpStatus: 503,
      code: retryable ? 'HOLDOUT_LEDGER_UNAVAILABLE' : 'HOLDOUT_LEDGER_REJECTED',
      message: retryable
        ? 'Holdout ledger is temporarily unavailable; read-only state could not be verified.'
        : 'Holdout ledger rejected the read-only request; state could not be verified.',
      retryable,
    };
  }

  if (/HOLDOUT_LEDGER_NOT_CONFIGURED/.test(message)) {
    return {
      httpStatus: 503,
      code: 'HOLDOUT_LEDGER_UNAVAILABLE',
      message: 'Holdout ledger is not configured; read-only state could not be verified.',
      retryable: false,
    };
  }

  const unavailable = /fetch failed|network|ECONN(?:REFUSED|RESET|ABORTED)?|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|AbortError|timeout/i.test(message);
  if (unavailable) {
    return {
      httpStatus: 503,
      code: 'HOLDOUT_LEDGER_UNAVAILABLE',
      message: 'Holdout ledger is unavailable; read-only state could not be verified.',
      retryable: true,
    };
  }

  return { httpStatus: 409, code: 'HOLDOUT_SAFE_BLOCK', message, retryable: false };
}
