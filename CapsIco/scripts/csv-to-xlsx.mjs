import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Accept an optional CSV path as first argument; default to exports/services-packages.csv
const argPath = process.argv[2];
const src = argPath ? path.resolve(process.cwd(), argPath) : path.resolve(__dirname, '..', 'exports', 'services-packages.csv');

if (!fs.existsSync(src)) {
  console.error(`CSV not found: ${src}`);
  process.exit(1);
}

// Determine destination .xlsx path next to the source file
const dest = path.resolve(path.dirname(src), `${path.basename(src, path.extname(src))}.xlsx`);

// Read as UTF-8 explicitly
const csv = fs.readFileSync(src, { encoding: 'utf8' });

// Create workbook from CSV
const wb = xlsx.read(csv, { type: 'string', raw: false, cellDates: false, codepage: 65001 });

// Write as xlsx
xlsx.writeFile(wb, dest, { bookType: 'xlsx' });

console.log(`Wrote: ${dest}`);
