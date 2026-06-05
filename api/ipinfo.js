import { handleIpInfoRequest, writeJsonResponse } from '../server/ipinfo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    await writeJsonResponse(res, {
      status: 405,
      body: { error: 'Method not allowed' }
    });
    return;
  }

  const result = await handleIpInfoRequest({
    url: req.url,
    env: process.env
  });
  await writeJsonResponse(res, result);
}
