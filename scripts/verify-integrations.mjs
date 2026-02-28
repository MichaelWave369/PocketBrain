import { readFileSync } from 'node:fs';

const has = (file, pattern) => pattern.test(readFileSync(file, 'utf8'));

const checks = [
  ['src/retrieval/retriever.ts', 'RetrievalOptions exported', /export\s+interface\s+RetrievalOptions/m],
  ['src/retrieval/retriever.ts', 'retrieveContext accepts RetrievalOptions', /retrieveContext[\s\S]*options:\s*RetrievalOptions/m],
  ['src/retrieval/retriever.ts', 'searchMessages exported', /export\s+const\s+searchMessages\s*=/m],
  ['src/providers/types.ts', 'describeImage provider contract defined', /describeImage\?:\s*\(imageBlob:\s*Blob/m],
  ['src/providers/openaiCompatibleProvider.ts', 'OpenAI bridge implements describeImage', /async\s+describeImage\(imageBlob:\s*Blob/m]
];

let failures = 0;
for (const [file, label, pattern] of checks) {
  if (!has(file, pattern)) {
    failures += 1;
    console.error(`✗ ${label} (${file})`);
  } else {
    console.log(`✓ ${label}`);
  }
}

if (failures > 0) {
  console.error(`\nIntegration verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nIntegration verification passed.');
