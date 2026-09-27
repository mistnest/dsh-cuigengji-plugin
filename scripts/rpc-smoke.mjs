const rawUrl = process.env.DSH_URL || (process.env.DSH_TOKEN
  ? `http://127.0.0.1:3080/?token=${encodeURIComponent(process.env.DSH_TOKEN)}`
  : '');
if (!rawUrl) {
  throw new Error('set DSH_URL to the tokenized URL printed by `dsh web`, or set DSH_TOKEN');
}

const base = new URL(rawUrl);
const origin = `${base.protocol}//${base.host}`;
let cookie = process.env.DSH_COOKIE || '';
if (!cookie) {
  const login = await fetch(base, { redirect: 'manual', headers: { accept: 'text/html' } });
  const setCookies = typeof login.headers.getSetCookie === 'function'
    ? login.headers.getSetCookie()
    : (login.headers.get('set-cookie') ? [login.headers.get('set-cookie')] : []);
  cookie = setCookies[0]?.split(';', 1)[0] || '';
  if (login.status !== 303 || !cookie) {
    throw new Error(`DSH authentication failed (HTTP ${login.status}); use the tokenized DSH_URL or DSH_COOKIE`);
  }
}

const endpoint = process.env.DSH_RPC_ENDPOINT || 'cuigengji/dispatch';
const rpcId = `cuigengji-rpc-smoke-${Date.now()}`;
const response = await fetch(new URL(`/api/${endpoint}`, base), {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    origin,
    cookie,
  },
  body: JSON.stringify({
    type: 'client-request',
    rpcId,
    method: endpoint,
    payload: JSON.parse(process.env.DSH_RPC_PAYLOAD || JSON.stringify({ action: 'settings.get', args: {}, sessionId: 'rpc-smoke' })),
  }),
});
const text = await response.text();
let body;
try { body = JSON.parse(text); } catch { throw new Error(`RPC response was not JSON (HTTP ${response.status}): ${text.slice(0, 200)}`); }
if (response.status !== 200 || body?.type !== 'server-response' || body.rpcId !== rpcId || body.result?.ok !== true) {
  throw new Error(`RPC contract failed: HTTP ${response.status} ${JSON.stringify(body)}`);
}
console.log(JSON.stringify({
  ok: true,
  endpoint: `/api/${endpoint}`,
  pluginVersion: body.result.value?.pluginVersion,
  supportedDsh: body.result.value?.supportedDsh,
}));
