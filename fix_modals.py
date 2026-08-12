import os
import re

src_dir = '/Users/maryow/CoramDeoMobile/src'
count = 0

def process_file(path):
    global count
    with open(path, 'r') as f:
        content = f.read()

    # Skip if not using hideDragHandle={true}
    if 'hideDragHandle={true}' not in content:
        return

    # Add import if missing
    if '{ ModalDragArea }' not in content:
        content = re.sub(r"import AppModal from (['\"])(.*?AppModal)['\"];", r"import AppModal, { ModalDragArea } from \1\2\1;", content)
    
    # Simple state machine to replace the exact View and its matching closing tag
    lines = content.split('\n')
    new_lines = []
    
    inside_target = False
    depth = 0
    changed = False

    for line in lines:
        if inside_target:
            # Check for <View or </View>
            # (assuming they aren't on the same line, or if they are, we count carefully)
            # Find all <View and </View> in the line
            opens = len(re.findall(r'<View\b[^>]*>', line))
            opens += len(re.findall(r'<View>', line))
            closes = len(re.findall(r'</View>', line))
            
            # Since sometimes we have <View /> self closing, those don't increment depth because they don't have </View>.
            # But wait, <View ... /> doesn't need </View>. So we only count <View> that are NOT self-closing.
            # A better way is:
            opens = len(re.findall(r'<View\b[^>]*?(?<!/)>', line))
            closes = len(re.findall(r'</View>', line))
            
            depth += opens
            depth -= closes
            
            if depth < 0:
                # We found the matching closing tag!
                # Replace the LAST </View> in this line with </ModalDragArea>
                # Using rfind to replace the last occurrence
                idx = line.rfind('</View>')
                if idx != -1:
                    line = line[:idx] + '</ModalDragArea>' + line[idx+7:]
                inside_target = False
                depth = 0
                
            new_lines.append(line)
        else:
            # Look for the target opening tags
            # pointerEvents="box-none" with styles.headerContainer or noteModalHeader or modalHeaderContainer
            if 'pointerEvents="box-none"' in line and ('styles.headerContainer' in line or 'styles.noteModalHeader' in line or 'styles.modalHeaderContainer' in line) and ('paddingTop: 12' in line or 'paddingTop: 10' in line):
                # Replace <View with <ModalDragArea and remove pointerEvents="box-none"
                line = line.replace('<View', '<ModalDragArea')
                line = line.replace(' pointerEvents="box-none"', '')
                inside_target = True
                depth = 0 # depth of children
                changed = True
                
                # If it's self-closing (rare for headers), handle it
                if '/>' in line:
                    inside_target = False
                    
            new_lines.append(line)
            
    new_content = '\n'.join(new_lines)
    if changed:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(path)}")
        count += 1

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') and file != 'EventDetailsModal.tsx':
            process_file(os.path.join(root, file))

print(f"Total files updated: {count}")
