import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.resolve(__dirname, '..', 'exports', 'services-packages.csv');
const destDir = path.resolve(__dirname, '..', 'exports');
const dest = path.resolve(destDir, 'services-packages-utf16.csv');

if (!fs.existsSync(src)) {
  console.error(`CSV not found: ${src}`);
  process.exit(1);
}

const content = fs.readFileSync(src, { encoding: 'utf8' });

// Prepend UTF-16 LE BOM and write file encoded in UTF-16LE.
const utf16 = Buffer.from('\uFEFF' + content, 'utf16le');
fs.writeFileSync(dest, utf16);

console.log(`Wrote: ${dest}`);
