import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { handleConfigRequest } from './config.js';
import { handleIpInfoRequest, writeJsonResponse } from './ipinfo.js';
import { handleNumverifyRequest } from './numverify.js';
import { handleTestTrafficRecordRequest } from './trafficRecords.js';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const port = Number(process.env.PORT || 4188);
const IP_LOOKUP_PATTERN = /^[a-zA-Z0-9:.%-]{1,128}$/;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const clean = normalize(decoded)
    .replace(/^([/\\])+/, '')
    .replace(/^(\.\.[/\\])+/, '');
  return join(root, clean === '' ? 'index.html' : clean);
}

async function serveStatic(req, res) {
  const filePath = safeFilePath(req.url);
  const target = existsSync(filePath) ? filePath : join(root, 'index.html');
  const type = contentTypes[extname(target)] || 'application/octet-stream';

  res.setHeader('content-type', type);
  createReadStream(target)
    .on('error', async () => {
      res.statusCode = 500;
      res.end(await readFile(join(root, 'index.html'), 'utf8'));
    })
    .pipe(res);
}

function normalizeIpWhoIsResponse(data) {
  return {
    success: true,
    ip: data.ip ?? '',
    country: data.country ?? '',
    city: data.city ?? '',
    isp: data.connection?.isp ?? '',
    org: data.connection?.org ?? '',
    type: data.type ?? '',
    isVPN: Boolean(
      data.security?.vpn ||
      data.security?.proxy ||
      data.security?.tor ||
      data.security?.anonymous ||
      data.security?.relay
    ),
    latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    timezone: data.timezone?.id ?? ''
  };
}

async function handleIpLookupRequest({ ip, fetchImpl = fetch }) {
  const lookupIp = ip?.trim() || '';

  if (!lookupIp) {
    return { status: 400, body: { success: false, error: 'ip query parameter is required' } };
  }

  if (!IP_LOOKUP_PATTERN.test(lookupIp)) {
    return { status: 400, body: { success: false, error: 'ip query parameter is invalid' } };
  }

  let response;
  try {
    response = await fetchImpl(`https://ipwho.is/${encodeURIComponent(lookupIp)}`, {
      headers: { accept: 'application/json' }
    });
  } catch {
    return { status: 500, body: { success: false, error: 'IP lookup provider request failed' } };
  }

  if (!response.ok) {
    return { status: 500, body: { success: false, error: 'IP lookup provider returned an error' } };
  }

  try {
    const data = await response.json();

    if (data.success === false) {
      return { status: 500, body: { success: false, error: data.message || 'IP lookup failed' } };
    }

    return { status: 200, body: normalizeIpWhoIsResponse(data) };
  } catch {
    return { status: 500, body: { success: false, error: 'IP lookup provider returned invalid JSON' } };
  }
}

createServer(async (req, res) => {
  if (req.url.startsWith('/api/ipLookup')) {
    const requestUrl = new URL(req.url, 'http://localhost');
    req.query = Object.fromEntries(requestUrl.searchParams.entries());
    const result = await handleIpLookupRequest({ ip: req.query.ip });
    await writeJsonResponse(res, result);
    return;
  }

  if (req.url.startsWith('/api/ipinfo')) {
    const result = await handleIpInfoRequest({ url: req.url });
    await writeJsonResponse(res, result);
    return;
  }

  if (req.url.startsWith('/api/numverify')) {
    const result = await handleNumverifyRequest({ url: req.url, env: process.env });
    await writeJsonResponse(res, result);
    return;
  }

  if (req.url.startsWith('/api/config')) {
    const result = await handleConfigRequest({ env: process.env });
    await writeJsonResponse(res, result);
    return;
  }

  if (req.url.startsWith('/api/test-traffic-record')) {
    const result = await handleTestTrafficRecordRequest({ method: req.method, req, env: process.env });
    await writeJsonResponse(res, result);
    return;
  }

  if (req.url.startsWith('/api/')) {
    await writeJsonResponse(res, { status: 404, body: { error: 'API route not found' } });
    return;
  }

  await serveStatic(req, res);
}).listen(port, '127.0.0.1');
