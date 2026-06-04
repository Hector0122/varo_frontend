const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const outputPath = path.resolve(__dirname, '..', 'src', 'config.ts');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

const vars = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  vars.push({ key, value });
}

const tsContent = `// Auto-generated from .env by scripts/generate-config.js
// Do not edit manually
${vars.map(v => `export const ${v.key}: string = '${v.value.replace(/'/g, "\\'")}';`).join('\n')}
`;

fs.writeFileSync(outputPath, tsContent);
console.log('✅ Generated src/config.ts from .env');
