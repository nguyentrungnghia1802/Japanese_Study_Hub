const baseUrl = new URL(process.env.API_SMOKE_BASE_URL || 'http://127.0.0.1:4000');
const endpoints = (process.env.API_SMOKE_ENDPOINTS || '/health,/health/ready')
  .split(',')
  .map((endpoint) => endpoint.trim())
  .filter(Boolean);
const maxApiBytes = Number.parseInt(process.env.API_RESPONSE_MAX_BYTES || '262144', 10);
const maxHealthBytes = Number.parseInt(process.env.API_HEALTH_MAX_BYTES || '2048', 10);
const token = process.env.API_SMOKE_TOKEN;

if (!Number.isFinite(maxApiBytes) || maxApiBytes <= 0) {
  throw new Error('API_RESPONSE_MAX_BYTES must be a positive integer');
}
if (!Number.isFinite(maxHealthBytes) || maxHealthBytes <= 0) {
  throw new Error('API_HEALTH_MAX_BYTES must be a positive integer');
}
if (endpoints.length === 0) {
  throw new Error('API_SMOKE_ENDPOINTS must contain at least one path');
}

for (const endpoint of endpoints) {
  const url = new URL(endpoint, baseUrl);
  if (url.origin !== baseUrl.origin) {
    throw new Error('API smoke endpoints must stay on the configured API origin');
  }

  const headers = token ? { Authorization: 'Bearer ' + token } : undefined;
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(5_000),
  });
  const bytes = new Uint8Array(await response.arrayBuffer()).byteLength;
  const limit =
    url.pathname.endsWith('/health') || url.pathname.endsWith('/health/ready')
      ? maxHealthBytes
      : maxApiBytes;

  console.log(endpoint + ' status=' + response.status + ' bytes=' + bytes + ' limit=' + limit);
  if (!response.ok) {
    throw new Error('API smoke request failed for ' + endpoint);
  }
  if (bytes > limit) {
    throw new Error('API response exceeds the configured byte limit for ' + endpoint);
  }
}
