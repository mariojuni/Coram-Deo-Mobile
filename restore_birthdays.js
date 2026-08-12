const fs = require('fs');

const feedsFile = 'src/features/feed/presentation/components/FeedsTab.tsx';
let feedsContent = fs.readFileSync(feedsFile, 'utf8');

const oldCommFile = 'old_community.tsx';
const oldCommContent = fs.readFileSync(oldCommFile, 'utf8');

// 1. Restore the imports
const importsToAdd = `import { formatBirthday, formatMemberName, parseMemberDate } from '../../../../features/member/domain/member.utils';
import type { Member } from '../../../../features/member/domain/member.types';
import { useMemberStore } from '../../../../store/useMemberStore';
`;

const lastImportIdxFeeds = feedsContent.lastIndexOf("import ");
const endOfLastImportFeeds = feedsContent.indexOf("\n", lastImportIdxFeeds) + 1;
feedsContent = feedsContent.substring(0, endOfLastImportFeeds) + importsToAdd + feedsContent.substring(endOfLastImportFeeds);

// 2. Restore the logic (useMemberStore + useMemo for birthdays)
const oldLogicStart = oldCommContent.indexOf("const members = useMemberStore");
const oldLogicEnd = oldCommContent.indexOf("  // 1. Highlights", oldLogicStart);
const oldLogic = oldCommContent.substring(oldLogicStart, oldLogicEnd);

const insertLogicPoint = feedsContent.indexOf("const userProfile = useAuthStore");
feedsContent = feedsContent.substring(0, insertLogicPoint) + oldLogic + feedsContent.substring(insertLogicPoint);

// 3. Restore the JSX
const oldJsxStart = oldCommContent.indexOf("{(todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (");
const oldJsxEnd = oldCommContent.indexOf("{/* ─── Frost Tab Filter Bar ───────────────────────────────────────── */}", oldJsxStart);
const oldJsx = oldCommContent.substring(oldJsxStart, oldJsxEnd);

const insertJsxPoint = feedsContent.indexOf("{/* ─── Frost Tab Filter Bar ───────────────────────────────────────── */}");
feedsContent = feedsContent.substring(0, insertJsxPoint) + oldJsx + feedsContent.substring(insertJsxPoint);

fs.writeFileSync(feedsFile, feedsContent);
