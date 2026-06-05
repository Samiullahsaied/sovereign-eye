import { writeJsonResponse } from '../server/ipinfo.js';
import { handleNumverifyRequest } from '../server/numverify.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    await writeJsonResponse(res, {
      status: 405,
      body: { error: 'Method not allowed' }
    });
    return;
  }

  const url = `/api/numverify?${new URLSearchParams(req.query).toString()}`;
  const result = await handleNumverifyRequest({ url, env: process.env });
  await writeJsonResponse(res, result);
}
