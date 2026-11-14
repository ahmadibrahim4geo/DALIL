const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dashboard', 'dashboard.html');
const jsPath = path.join(__dirname, '..', 'dashboard', 'dashboard.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
const ids = new Set();
let m;
while ((m = regex.exec(js)) !== null) {
  ids.add(m[1]);
}

const missing = [];
for (const id of ids) {
  const pattern1 = `id="${id}"`;
  const pattern2 = `id='${id}'`;
  if (!html.includes(pattern1) && !html.includes(pattern2)) {
    missing.push(id);
  }
}

console.log(`Total getElementById audited: ${ids.size}`);
if (missing.length > 0) {
  console.log(`⚠️ Missing IDs in HTML (${missing.length}):`, missing);
} else {
  console.log('✅ All element IDs exist in dashboard.html!');
}
