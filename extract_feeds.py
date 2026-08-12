import re

with open('src/app/(tabs)/community.tsx', 'r') as f:
    content = f.read()

# We want to extract FeedsTab and its related local interfaces/types.
# Let's find the start of the FeedsTab dependencies:
start_marker = "let isLocalHighlightsSynced = false;"
end_marker = "function SongsTab({ searchQuery }: SubScreenProps) {"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

feeds_tab_code = content[start_idx:end_idx]

# Remove it from community.tsx
new_content = content[:start_idx] + "\n" + content[end_idx:]

# We need to add the import to new_content
import_stmt = "import { FeedsTab } from '../../components/Community/FeedsTab';\n"
# Find a good place for import (after other internal imports)
last_import_idx = new_content.rfind("import ")
end_of_last_import = new_content.find("\n", last_import_idx) + 1
new_content = new_content[:end_of_last_import] + import_stmt + new_content[end_of_last_import:]

with open('src/app/(tabs)/community.tsx', 'w') as f:
    f.write(new_content)

# Now, we need to create FeedsTab.tsx with all the necessary imports.
# We will just copy ALL imports from community.tsx (which is safe, unused imports will be ignored or fixed by linter)
# and add PrayerCardItem if needed, but wait, PrayerCardItem is in community.tsx! 
# We should probably export PrayerCardItem from community.tsx or move it too.
# Let's move PrayerCardItem to FeedsTab.tsx as well!

