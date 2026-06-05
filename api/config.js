import { handleConfigRequest } from '../server/config.js';
import { writeJsonResponse } from '../server/ipinfo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    await writeJsonResponse(res, {
      status: 405,
      body: { error: 'Method not allowed' }
    });
    return;
  }

  const result = await handleConfigRequest({ env: process.env });
  await writeJsonResponse(res, result);
}
