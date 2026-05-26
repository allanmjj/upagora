const fs = require('fs');
const path = require('path');
function walk(d) {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.match(/\{ params \}: \{ params: \{ id: string/)) {
        console.log(p);
      }
    }
  });
}
walk('D:/hermes-lab/AGORA/app/src/app/api');
