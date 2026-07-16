const fs = require('fs');
const path = require('path');
const dir = 'src/services/__tests__';
fs.readdirSync(dir).filter(f => f.endsWith('.test.ts')).forEach(f => {
  const file = path.join(dir, f);
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/await new Promise\((?:r|resolve) => setTimeout\((?:r|resolve), (\d+)\)\);/g, 'await delay($1);');
  if (!newContent.includes('import { delay }') && newContent !== content) {
    newContent = newContent.replace(/import \{ db \} from '\.\.\/\.\.\/db';/, "import { db } from '../../db';\nimport { delay } from '../../__tests__/test-utils';");
  }
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
});
