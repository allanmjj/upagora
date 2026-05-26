const fs = require('fs');
const path = require('path');
function walk(d) {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f === 'node_modules' || f === '.next') return;
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const bn = path.basename(p);
      if (bn === 'page.tsx' || bn === 'route.ts') {
        const c = fs.readFileSync(p, 'utf8');
        if (c.match(/\{ params \}: \{ params: \{/) || c.match(/\{ params, searchParams \}/) && c.match(/params: \{/)) {
          console.log(p);
        }
      }
    }
  });
}
walk('D:/hermes-lab/AGORA/app/src/app');
