const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const css  = fs.readFileSync('css/styles.css','utf8');
const used = new Set();
const re = /class="([^"]+)"/g;
let m;
while ((m = re.exec(html)) !== null) {
  m[1].split(/\s+/).forEach(c => used.add(c));
}
const ignore = new Set(['open','animated','visible','scrolled','active','show']);
const missing = [];
used.forEach(cls => {
  if (!cls || ignore.has(cls)) return;
  // c1/c2 are checked as .c1/.c2
  if (!css.includes('.' + cls)) missing.push(cls);
});
console.log('Used classes:', used.size);
console.log('Missing from CSS:', missing.length ? missing.join(', ') : 'NONE');
