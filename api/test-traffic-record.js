import { writeJsonResponse } from '../server/ipinfo.js';
import { handleTestTrafficRecordRequest } from '../server/trafficRecords.js';

export default async function handler(req, res) {
  const result = await handleTestTrafficRecordRequest({
    method: req.method,
    req,
    env: process.env
  });
  await writeJsonResponse(res, result);
}
