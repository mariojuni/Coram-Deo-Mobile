const fs = require('fs');

const commFile = 'src/app/(tabs)/community.tsx';
const feedsFile = 'src/components/Community/FeedsTab.tsx';

let commContent = fs.readFileSync(commFile, 'utf8');

// Rename Members to Feeds in community.tsx
commContent = commContent.replace(
  "{ key: 'members', label: 'Members', icon: Users },",
  "{ key: 'feeds', label: 'Feeds', icon: Layers },"
);
commContent = commContent.replace(
  "members: 3,",
  "feeds: 3,"
);
commContent = commContent.replace(
  "MembersTab,",
  "FeedsTab,"
);
commContent = commContent.replace(
  "members: '',",
  "feeds: '',"
);
commContent = commContent.replace(
  "members: 'Search members',",
  "feeds: 'Search feeds',"
);

// We need to export SubScreenProps, prayerStyles, eventsStyles, membersStyles, placeholder from community.tsx
// wait, if we export them, we can import them in FeedsTab.tsx
commContent = commContent.replace(
  "type SubScreenProps",
  "export type SubScreenProps"
);
commContent = commContent.replace(
  "const placeholder = ",
  "export const placeholder = "
);
commContent = commContent.replace(
  "const membersStyles = ",
  "export const membersStyles = "
);

// We should also export PrayerCardItem since it's used in PrayersTab.
commContent = commContent.replace(
  "function PrayerCardItem",
  "export function PrayerCardItem"
);

// We will export FeedsTab from FeedsTab.tsx and import it in community.tsx
const importStmt = "import { FeedsTab } from '../../components/Community/FeedsTab';\n";
const lastImportIdx = commContent.lastIndexOf("import ");
const endOfLastImport = commContent.indexOf("\n", lastImportIdx) + 1;
commContent = commContent.substring(0, endOfLastImport) + importStmt + commContent.substring(endOfLastImport);


// Now we remove FeedsTab, isLocalHighlightsSynced, CommunityMemberTabFilter, CombinedFeedItem, parseFeedTimestamp from community.tsx
// They will live in FeedsTab.tsx
const startMarker = "let isLocalHighlightsSynced = false;";
const endMarker = "function SongsTab";
const startIdx = commContent.indexOf(startMarker);
const endIdx = commContent.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  commContent = commContent.substring(0, startIdx) + "\n" + commContent.substring(endIdx);
}

fs.writeFileSync(commFile, commContent);


// Now for FeedsTab.tsx
// We keep all imports at the top, add imports for SubScreenProps, PrayerCardItem, membersStyles, placeholder from community.tsx
// We remove all the tabs and CommunityScreen, keeping only FeedsTab, isLocalHighlightsSynced, CommunityMemberTabFilter, CombinedFeedItem, parseFeedTimestamp

let feedsContent = fs.readFileSync(feedsFile, 'utf8');

const additionalImports = `
import { SubScreenProps, PrayerCardItem, membersStyles, placeholder } from '../../app/(tabs)/community';
`;
const lastImportIdxFeeds = feedsContent.lastIndexOf("import ");
const endOfLastImportFeeds = feedsContent.indexOf("\n", lastImportIdxFeeds) + 1;
feedsContent = feedsContent.substring(0, endOfLastImportFeeds) + additionalImports + feedsContent.substring(endOfLastImportFeeds);

// Find the start of FeedsTab stuff
const feedsStartIdx = feedsContent.indexOf(startMarker);

// Replace MembersTab to FeedsTab in the function signature
feedsContent = feedsContent.replace("function MembersTab({", "export function FeedsTab({");

// Keep everything from top to endOfLastImportFeeds, then the FeedsTab stuff
const endMarkerFeeds = "function SongsTab";
const endFeedsIdx = feedsContent.indexOf(endMarkerFeeds);

feedsContent = feedsContent.substring(0, endOfLastImportFeeds) + "\n" + feedsContent.substring(feedsStartIdx, endFeedsIdx);

fs.writeFileSync(feedsFile, feedsContent);
