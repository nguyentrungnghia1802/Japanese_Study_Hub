import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = join(workspaceRoot, 'apps', 'web', '.next');
const manifestPath = join(buildRoot, 'app-build-manifest.json');
const chunksRoot = join(buildRoot, 'static', 'chunks');

const MAX_STATIC_JS_BYTES = 1_250_000;
const MAX_ROUTE_JS_BYTES = 450 * 1024;
const MAX_CHUNK_JS_BYTES = 220 * 1024;

function collectJavaScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path);
    }
  }
  return files;
}

if (!statSync(manifestPath, { throwIfNoEntry: false })) {
  throw new Error(
    'Web production build is missing. Run pnpm --filter @japanese-learning/web build first.',
  );
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const staticFiles = collectJavaScriptFiles(chunksRoot);
const sizeByManifestPath = new Map(
  staticFiles.map((path) => [relative(buildRoot, path).replaceAll('\\', '/'), statSync(path).size]),
);

const missingFiles = [];
const routeSizes = [];
for (const [route, files] of Object.entries(manifest.pages ?? {})) {
  let routeBytes = 0;
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const size = sizeByManifestPath.get(file);
    if (size === undefined) {
      missingFiles.push(file);
    } else {
      routeBytes += size;
    }
  }
  routeSizes.push({ route, bytes: routeBytes });
}

const largestChunk = Math.max(...sizeByManifestPath.values(), 0);
const totalStaticBytes = [...sizeByManifestPath.values()].reduce(
  (total, bytes) => total + bytes,
  0,
);
const largestRoute = routeSizes.reduce(
  (largest, current) => (current.bytes > largest.bytes ? current : largest),
  { route: 'none', bytes: 0 },
);

const failures = [];
if (missingFiles.length > 0) {
  failures.push('manifest references missing JavaScript: ' + missingFiles.join(', '));
}
if (totalStaticBytes > MAX_STATIC_JS_BYTES) {
  failures.push('total static JavaScript exceeds ' + MAX_STATIC_JS_BYTES + ' bytes');
}
if (largestChunk > MAX_CHUNK_JS_BYTES) {
  failures.push('largest JavaScript chunk exceeds ' + MAX_CHUNK_JS_BYTES + ' bytes');
}
if (largestRoute.bytes > MAX_ROUTE_JS_BYTES) {
  failures.push(
    'largest route JavaScript exceeds ' + MAX_ROUTE_JS_BYTES + ' bytes: ' + largestRoute.route,
  );
}

console.log(
  JSON.stringify({
    totalStaticJsBytes: totalStaticBytes,
    largestChunkBytes: largestChunk,
    largestRoute,
    limits: {
      maxStaticJsBytes: MAX_STATIC_JS_BYTES,
      maxChunkJsBytes: MAX_CHUNK_JS_BYTES,
      maxRouteJsBytes: MAX_ROUTE_JS_BYTES,
    },
  }),
);

if (failures.length > 0) {
  for (const failure of failures) console.error('Bundle guardrail failed: ' + failure);
  process.exitCode = 1;
}
