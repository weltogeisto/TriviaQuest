import { readFileSync } from 'node:fs';

const bank = JSON.parse(readFileSync(new URL('../bank.json', import.meta.url), 'utf8'));
const normalize = (text) => String(text || '')
  .toLowerCase()
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

let errorCount = 0;

for (const [category, questions] of Object.entries(bank)) {
  if (!Array.isArray(questions) || questions.length !== 120) {
    console.error(`Category ${category} must contain exactly 120 questions`);
    errorCount += 1;
    continue;
  }

  const seenQuestions = new Set();

  questions.forEach((q, idx) => {
    const valid = q
      && typeof q.question === 'string'
      && !/practice variant/i.test(q.question)
      && Array.isArray(q.options)
      && q.options.length === 4
      && q.options.every((opt) => typeof opt === 'string' && opt.trim())
      && new Set(q.options.map((opt) => normalize(opt))).size === 4
      && Number.isInteger(q.correct)
      && q.correct >= 0
      && q.correct <= 3
      && typeof q.category === 'string'
      && q.category === category;

    if (!valid) {
      console.error(`Invalid question schema in ${category}[${idx}]`);
      errorCount += 1;
      return;
    }

    const key = normalize(q.question);
    if (seenQuestions.has(key)) {
      console.error(`Exact duplicate question in ${category}[${idx}]`);
      errorCount += 1;
    }
    seenQuestions.add(key);
  });
}

if (errorCount > 0) process.exit(1);
const total = Object.values(bank).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Bank OK (${Object.keys(bank).length} categories, ${total} questions validated).`);
