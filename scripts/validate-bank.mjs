import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script id="embeddedBank" type="application\/json">([\s\S]*?)<\/script>/);
if (!match) {
  console.error('embeddedBank payload not found');
  process.exit(1);
}

const stem = (text) => String(text || '').replace(/\s*\(Practice Variant\s+\d+\)\s*$/i, '').trim();
const bank = JSON.parse(match[1]);
let errorCount = 0;

for (const [category, questions] of Object.entries(bank)) {
  if (!Array.isArray(questions) || questions.length < 100) {
    console.error(`Category ${category} has fewer than 100 questions`);
    errorCount += 1;
    continue;
  }

  const seenExact = new Set();
  const stemSet = new Set();

  questions.forEach((q, idx) => {
    const valid = q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3;
    if (!valid) {
      console.error(`Invalid question schema in ${category}[${idx}]`);
      errorCount += 1;
      return;
    }

    const key = q.question.trim().toLowerCase();
    if (seenExact.has(key)) {
      console.error(`Exact duplicate question in ${category}[${idx}]`);
      errorCount += 1;
    }
    seenExact.add(key);
    stemSet.add(stem(q.question).toLowerCase());
  });

  if (stemSet.size < 10) {
    console.error(`Category ${category} has low stem variety (${stemSet.size}); expected at least 10 unique stems`);
    errorCount += 1;
  }
}

if (errorCount > 0) {
  process.exit(1);
}

const total = Object.values(bank).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Bank OK (${Object.keys(bank).length} categories, ${total} questions validated).`);
