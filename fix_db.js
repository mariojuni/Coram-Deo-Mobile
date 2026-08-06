const fs = require('fs');
const glob = require('glob'); // Not available by default, we'll use find

const execSync = require('child_process').execSync;
const files = execSync('find src -name "*.ts" -o -name "*.tsx"').toString().split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Only process files importing db or auth from firebase
  if (!content.includes('firebase')) continue;

  // Fix imports
  if (content.match(/import\s+\{[^}]*\bdb\b[^}]*\}\s+from\s+['"][./]+firebase['"]/)) {
    content = content.replace(/\bdb\b/g, 'getActiveDb');
    // Remove duplicates if getActiveDb is already imported
    content = content.replace(/getActiveDb\s*,\s*getActiveDb/, 'getActiveDb');
    changed = true;
  }
  
  // Also fix 'auth' import if it exists, replace with getActiveAuth
  if (content.match(/import\s+\{[^}]*\bauth\b[^}]*\}\s+from\s+['"][./]+firebase['"]/)) {
    content = content.replace(/\bauth\b(?!(\.|:|[a-zA-Z]))/g, 'getActiveAuth()');
    content = content.replace(/import\s+\{\s*(.*?)\s*\}\s+from\s+['"][./]+firebase['"]/g, (match, p1) => {
        let imports = p1.split(',').map(s => s.trim()).filter(Boolean);
        imports = imports.map(i => i === 'getActiveAuth()' ? 'getActiveAuth' : i);
        // remove old auth if it became getActiveAuth()
        imports = [...new Set(imports)];
        return match.replace(p1, imports.join(', '));
    });
    changed = true;
  }

  if (changed) {
    // Fix function calls
    content = content.replace(/collection\(\s*getActiveDb\s*,/g, 'collection(getActiveDb(),');
    content = content.replace(/doc\(\s*getActiveDb\s*,/g, 'doc(getActiveDb(),');
    content = content.replace(/writeBatch\(\s*getActiveDb\s*\)/g, 'writeBatch(getActiveDb())');
    content = content.replace(/runTransaction\(\s*getActiveDb\s*,/g, 'runTransaction(getActiveDb(),');
    
    // Fix edge cases where getActiveDb might be passed directly
    content = content.replace(/\(\s*getActiveDb\s*,/g, '(getActiveDb(),');
    
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
