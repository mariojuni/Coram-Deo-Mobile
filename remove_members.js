const fs = require('fs');
const file = 'src/features/feed/presentation/components/FeedsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove useMemberStore and its logic
content = content.replace(/const members = useMemberStore[^\n]*\n/, "");
const todayBirthdaysStart = content.indexOf("const { todayBirthdays, upcomingBirthdays } = useMemo(() => {");
const todayBirthdaysEnd = content.indexOf("  // 1. Highlights", todayBirthdaysStart);
if (todayBirthdaysStart !== -1 && todayBirthdaysEnd !== -1) {
  content = content.substring(0, todayBirthdaysStart) + content.substring(todayBirthdaysEnd);
}

// 2. Remove the JSX rendering the birthdays
const jsxStartStr = "{(todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (";
const jsxStartIdx = content.indexOf(jsxStartStr);
if (jsxStartIdx !== -1) {
  // We need to find the matching closing tag or just remove up to the Frost Tab Filter Bar
  const frostTabStart = content.indexOf("{/* ─── Frost Tab Filter Bar ───────────────────────────────────────── */}", jsxStartIdx);
  if (frostTabStart !== -1) {
    content = content.substring(0, jsxStartIdx) + content.substring(frostTabStart);
  }
}

// 3. Remove unused imports
content = content.replace(/import { formatBirthday, formatMemberName, parseMemberDate } from '\.\.\/\.\.\/\.\.\/\.\.\/features\/member\/domain\/member\.utils';\n/, "");
content = content.replace(/import type { Member } from '\.\.\/\.\.\/\.\.\/\.\.\/features\/member\/domain\/member\.types';\n/, "");
content = content.replace(/import { useMemberStore } from '\.\.\/\.\.\/\.\.\/\.\.\/store\/useMemberStore';\n/, "");

fs.writeFileSync(file, content);
