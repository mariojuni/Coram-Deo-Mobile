import os
import re

src_dir = '/Users/maryow/CoramDeoMobile/src'
count = 0

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()

            if 'hideDragHandle={true}' in content and 'AppModal' in content:
                original = content
                
                # Fix imports
                if '{ ModalDragArea }' not in content:
                    content = re.sub(r"import AppModal from (['\"])(.*?AppModal)['\"];", r"import AppModal, { ModalDragArea } from \1\2\1;", content)
                
                # We need to replace the View that wraps the header and has pointerEvents="box-none"
                # with ModalDragArea, and remove pointerEvents="box-none".
                
                # Since the tags can span multiple lines, let's do a more robust replacement.
                # Usually it looks like: <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
                # We replace <View ... pointerEvents="box-none"> with <ModalDragArea ...>
                # And the matching </View> with </ModalDragArea>.
                
                # To do this safely, we will look for:
                # <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
                # <BlurView ...
                # ...
                # </View>
                # Actually, an easier way is to just replace the opening tag and we'll manually replace the closing tag.
                
                # Let's find all <View that have pointerEvents="box-none" and contain BlurView shortly after.
                # Actually, just replacing any <View style={...} pointerEvents="box-none"> that contains a drag handle inside is tricky with regex.
                # Let's do this: 
                # Find <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
                content = content.replace('<View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">', '<ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>')
                content = content.replace('<View style={[styles.headerContainer]} pointerEvents="box-none">', '<ModalDragArea style={[styles.headerContainer]}>')
                content = content.replace('<View style={[styles.noteModalHeader, { paddingTop: 12 }]} pointerEvents="box-none">', '<ModalDragArea style={[styles.noteModalHeader, { paddingTop: 12 }]}>')
                
                # We also need to change the matching </View> to </ModalDragArea>
                # The closing tag is usually right after </BounceCard> or </TouchableOpacity> inside the headerContent.
                # A simple regex for the closing tag of the header:
                content = re.sub(r'(</View>)\n(\s*)(\w*</ScrollView>|\w*<ScrollView|\w*<View style=\{styles\.rsvpSection|\w*<Animated\.ScrollView|\w*<FlatList|\w*<SectionList|\w*<KeyboardAvoidingView)', r'</ModalDragArea>\n\2\3', content)

                
                if content != original:
                    with open(path, 'w') as f:
                        f.write(content)
                    print(f"Updated {file}")
                    count += 1

print(f"Total files updated: {count}")
