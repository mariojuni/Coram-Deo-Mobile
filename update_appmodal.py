import re

with open('src/components/ui/AppModal.tsx', 'r') as f:
    content = f.read()

# 1. Add React import
if 'import React' not in content:
    content = content.replace("import { ReactNode", "import React, { ReactNode")

# 2. Add ModalDragContext and ModalDragArea
if 'ModalDragContext' not in content:
    context_code = """
export const ModalDragContext = React.createContext<Record<string, any>>({});

export function ModalDragArea({ children, style, pointerEvents }: { children: React.ReactNode, style?: import('react-native').StyleProp<import('react-native').ViewStyle>, pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto' }) {
  const panHandlers = React.useContext(ModalDragContext);
  return (
    <View style={style} pointerEvents={pointerEvents} {...panHandlers}>
      {children}
    </View>
  );
}
"""
    content = content.replace("interface AppModalProps", context_code + "\ninterface AppModalProps")

# 3. Update the panResponder to be more robust
pan_responder_code = """
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            slideAnim.setValue(g.dy);
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 100 || g.vy > 1.2) {
            Animated.timing(slideAnim, {
              toValue: windowHeight,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onCloseRef.current();
            });
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 0,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [slideAnim, windowHeight]
  );
"""

# Replace existing panResponder if it's the old short one or just replace it.
content = re.sub(r'const panResponder = useMemo\([\s\S]*?\[slideAnim, windowHeight\]\n  \);', pan_responder_code.strip(), content)

# 4. Wrap children in Context Provider
if '<ModalDragContext.Provider' not in content:
    content = content.replace('{children}', '<ModalDragContext.Provider value={panResponder.panHandlers}>\n              {children}\n            </ModalDragContext.Provider>')

# 5. Add dragHandlers to default dragHandle
if 'dragHandleContainer' not in content:
    content = content.replace('{!hideDragHandle && <View style={styles.dragHandle} />}', 
        '{!hideDragHandle && (<View {...panResponder.panHandlers} style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>)}')
    
    # Add style
    content = content.replace('dragHandle: {', 'dragHandleContainer: { paddingVertical: 12 },\n  dragHandle: {')
    # Remove margins from dragHandle
    content = content.replace('marginTop: 12,\n    marginBottom: 4,', '')

with open('src/components/ui/AppModal.tsx', 'w') as f:
    f.write(content)
