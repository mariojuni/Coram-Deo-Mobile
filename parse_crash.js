const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf-8').split('\n');
let jsonStr = '';
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('{"app_name"')) continue;
  jsonStr += lines[i] + '\n';
}

try {
  const data = JSON.parse(jsonStr);
  if (data.asi) {
    console.log("ASI:", JSON.stringify(data.asi, null, 2));
  } else {
    console.log("No ASI found.");
  }
} catch (e) {
  console.log("Error parsing JSON:", e.message);
}
