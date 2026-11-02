/* Copies the built site (dist/) into docs/, the folder the host serves. Run: npm run publish */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), from = path.join(root, 'dist'), to = path.join(root, 'docs');
if (!fs.existsSync(path.join(from, 'index.html'))) { console.error('dist/ is missing. Run: npm run build'); process.exit(1); }
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
fs.writeFileSync(path.join(to, '.nojekyll'), '');
console.log('published dist/ to docs/');
