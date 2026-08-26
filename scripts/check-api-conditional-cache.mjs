import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const baseUrl = new URL(process.env.API_SMOKE_BASE_URL || 'http://127.0.0.1:4000');
const token = process.env.API_SMOKE_TOKEN;
const revalidationPath = process.env.API_CACHE_SMOKE_PATH || '/api/v1/recent-learning';
const authPath = process.env.API_CACHE_AUTH_PATH || '/api/v1/auth/me';

if (!token) {
  throw new Error('API_SMOKE_TOKEN is required for the conditional-cache smoke.');
}
if (!['http:', 'https:'].includes(baseUrl.protocol)) {
  throw new Error('API_SMOKE_BASE_URL must use http or https.');
}

function requestOnce(path, headers = {}) {
  const url = new URL(path, baseUrl);
  if (url.origin !== baseUrl.origin) {
    throw new Error('API cache smoke paths must stay on the configured API origin.');
  }

  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const clientRequest = request(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token,
          ...headers,
        },
        signal: AbortSignal.timeout(5_000),
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            bodyBytes: Buffer.concat(chunks).byteLength,
          }),
        );
      },
    );
    clientRequest.on('error', reject);
    clientRequest.end();
  });
}

const first = await requestOnce(revalidationPath);
const etag = first.headers.etag;
const second = await requestOnce(revalidationPath, { 'If-None-Match': etag ?? '' });
const auth = await requestOnce(authPath);

console.log(
  'revalidation first=' +
    first.status +
    ' bytes=' +
    first.bodyBytes +
    ' etag=' +
    Boolean(etag) +
    ' cache=' +
    first.headers['cache-control'] +
    ' vary=' +
    first.headers.vary,
);
console.log(
  'revalidation conditional=' +
    second.status +
    ' bytes=' +
    second.bodyBytes +
    ' auth-cache=' +
    auth.headers['cache-control'],
);

if (
  first.status !== 200 ||
  !etag ||
  first.headers['cache-control'] !== 'private, no-cache' ||
  !String(first.headers.vary || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .includes('authorization') ||
  second.status !== 304 ||
  second.bodyBytes !== 0 ||
  auth.status !== 200 ||
  auth.headers['cache-control'] !== 'no-store'
) {
  throw new Error('API conditional-cache smoke failed.');
}
