const fs = require('fs');

const feedsFile = 'src/components/Community/FeedsTab.tsx';
let feedsContent = fs.readFileSync(feedsFile, 'utf8');

const additionalImports = `import { SubScreenProps, PrayerCardItem, membersStyles, placeholder } from '../../app/(tabs)/community';\n`;

// insert it at the very top
feedsContent = additionalImports + feedsContent;

fs.writeFileSync(feedsFile, feedsContent);
