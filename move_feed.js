const fs = require('fs');

// 1. Create domain files
const feedTypesPath = 'src/features/feed/domain/feed.types.ts';
const feedUtilsPath = 'src/features/feed/domain/feed.utils.ts';

fs.writeFileSync(feedTypesPath, `export type CommunityMemberTabFilter = 'all' | 'prayers' | 'highlights' | 'notes';\n\nexport interface CombinedFeedItem {\n  type: 'highlight' | 'prayer' | 'note';\n  data: any;\n  timestamp: number;\n}\n`);
fs.writeFileSync(feedUtilsPath, `export function parseFeedTimestamp(dateVal: any): number {\n  if (!dateVal) return 0;\n  if (typeof dateVal === 'number') return dateVal;\n  if (typeof dateVal === 'string') return new Date(dateVal).getTime() || 0;\n  if (dateVal instanceof Date) return dateVal.getTime();\n  if (typeof dateVal?.toDate === 'function') return dateVal.toDate().getTime();\n  if (typeof dateVal?.seconds === 'number') return dateVal.seconds * 1000;\n  return 0;\n}\n`);

// 2. Move and update FeedsTab.tsx
const oldFeedsPath = 'src/components/Community/FeedsTab.tsx';
const newFeedsPath = 'src/features/feed/presentation/components/FeedsTab.tsx';
let feedsContent = fs.readFileSync(oldFeedsPath, 'utf8');

// Remove domain stuff from FeedsTab.tsx
feedsContent = feedsContent.replace("type CommunityMemberTabFilter = 'all' | 'prayers' | 'highlights' | 'notes';", "");
feedsContent = feedsContent.replace(/interface CombinedFeedItem {[\s\S]*?}/, "");
feedsContent = feedsContent.replace(/function parseFeedTimestamp[\s\S]*?return 0;\n}/, "");

// Add imports for feed.types and feed.utils
const newImports = `import { CommunityMemberTabFilter, CombinedFeedItem } from '../../domain/feed.types';\nimport { parseFeedTimestamp } from '../../domain/feed.utils';\n`;

// Also fix imports since we moved deeper.
// the current imports:
// import { SubScreenProps, PrayerCardItem, membersStyles, placeholder } from '../../app/(tabs)/community';
// This was 2 levels deep, now it's 4 levels deep: ../../../../app/(tabs)/community
feedsContent = feedsContent.replace(/from '\.\.\/\.\.\/app\/\(tabs\)\/community'/g, "from '../../../../app/(tabs)/community'");
feedsContent = feedsContent.replace(/from '@\/features\//g, "from '../../../../features/"); // though @/ is alias, it works anyway, let's keep @/
feedsContent = feedsContent.replace(/from '\.\.\/\.\.\/components\//g, "from '../../../../components/");
feedsContent = feedsContent.replace(/from '\.\.\/\.\.\/features\//g, "from '../../../../features/");
feedsContent = feedsContent.replace(/from '\.\.\/\.\.\/permissions\//g, "from '../../../../permissions/");
feedsContent = feedsContent.replace(/from '\.\.\/\.\.\/store\//g, "from '../../../../store/");

// insert newImports
const lastImportIdxFeeds = feedsContent.lastIndexOf("import ");
const endOfLastImportFeeds = feedsContent.indexOf("\n", lastImportIdxFeeds) + 1;
feedsContent = feedsContent.substring(0, endOfLastImportFeeds) + newImports + feedsContent.substring(endOfLastImportFeeds);

fs.writeFileSync(newFeedsPath, feedsContent);

// 3. Update community.tsx
const commPath = 'src/app/(tabs)/community.tsx';
let commContent = fs.readFileSync(commPath, 'utf8');
commContent = commContent.replace(
  "import { FeedsTab } from '../../components/Community/FeedsTab';",
  "import { FeedsTab } from '../../features/feed/presentation/components/FeedsTab';"
);
fs.writeFileSync(commPath, commContent);

// 4. Remove old file
fs.unlinkSync(oldFeedsPath);

console.log("Migration complete.");
