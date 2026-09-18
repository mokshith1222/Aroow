
import fs from 'fs';
import path from 'path';

function processDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      processDir(full);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      let content = fs.readFileSync(full, 'utf8');
      content = content.replace(/import\s+\{([^}]+)\}\s+from\s+(['"](?:\.\.\/game\/types|\.\/types)['"])/g, 'import type { $1 } from $2');
      fs.writeFileSync(full, content, 'utf8');
    }
  }
}

processDir('./src');
console.log('Converted type imports to import type');
