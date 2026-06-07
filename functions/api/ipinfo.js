import { handleIpInfoRequest } from '../../server/ipinfo.js';

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init.headers
    }
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const result = await handleIpInfoRequest({
    url: request.url,
    env,
    fetchImpl: fetch
  });

  return json(result.body, { status: result.status });
}
