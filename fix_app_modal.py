with open('src/components/ui/AppModal.tsx', 'r') as f:
    content = f.read()

# Fix ModalDragArea definition
content = content.replace("""    <View style={style} pointerEvents={pointerEvents} {...panHandlers}>
      <ModalDragContext.Provider value={panResponder.panHandlers}>
              {children}
            </ModalDragContext.Provider>
    </View>""", """    <View style={style} pointerEvents={pointerEvents} {...panHandlers}>
      {children}
    </View>""")

# Add PanResponder and useRef to imports if missing
if 'PanResponder' not in content.split('\\n')[3]:
    content = content.replace("ViewStyle } from 'react-native';", "ViewStyle, PanResponder } from 'react-native';")
    
if 'useRef' not in content.split('\\n')[2]:
    content = content.replace("useState } from 'react';", "useState, useRef } from 'react';")

with open('src/components/ui/AppModal.tsx', 'w') as f:
    f.write(content)
