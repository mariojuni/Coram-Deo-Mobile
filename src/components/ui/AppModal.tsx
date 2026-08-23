import { BounceCard } from '@/components/ui/BounceCard';
import { X } from 'lucide-react-native';
import React, { ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleProp, StyleSheet, Text, TouchableWithoutFeedback, View, ViewStyle, PanResponder } from 'react-native';



import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


export const ModalDragContext = React.createContext<Record<string, any>>({});

export function ModalDragArea({ children, style, pointerEvents }: { children?: React.ReactNode, style?: import('react-native').StyleProp<import('react-native').ViewStyle>, pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto' }) {
  const panHandlers = React.useContext(ModalDragContext);
  return (
    <View style={style} pointerEvents={pointerEvents} {...panHandlers}>
      {children}
    </View>
  );
}

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  headerTitleAlign?: 'left' | 'center';
  hideHeader?: boolean;
  hideDragHandle?: boolean;
  heightRatio?: number;
  dynamicHeight?: boolean;
  avoidKeyboard?: boolean;
}

export default function AppModal({ isOpen, onClose, title, children, containerStyle, headerLeft, headerRight, headerTitleAlign = 'center', hideHeader = false, hideDragHandle = false, heightRatio = 0.5, dynamicHeight = false, avoidKeyboard = true }: AppModalProps) {
  const slideAnim = useMemo(() => new Animated.Value(600), []);
  const insets = useSafeAreaInsets();

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const windowHeight = Dimensions.get('window').height;
  const maxSheetHeight = windowHeight * heightRatio;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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

  useEffect(() => {
    if (!avoidKeyboard) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [avoidKeyboard]);

  const sheetBg = StyleSheet.flatten(containerStyle)?.backgroundColor;

  useEffect(() => {
    if (isOpen) {
      slideAnim.setValue(windowHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    }
  }, [isOpen, slideAnim, windowHeight]);

  return (
    <Modal visible={isOpen} animationType="none" transparent={true} onRequestClose={onClose} supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, sheetBg ? { backgroundColor: sheetBg } : null, dynamicHeight ? { flex: undefined } : { height: maxSheetHeight }, { transform: [{ translateY: slideAnim }], maxHeight: maxSheetHeight, marginBottom: avoidKeyboard ? keyboardHeight : 0, marginLeft: insets.left, marginRight: insets.right }]}>
          {!hideDragHandle && (<View {...panResponder.panHandlers} style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>)}

          {/* Header */}
          {!hideHeader && (
            <View style={styles.header}>
              <View style={[styles.headerSide, { alignItems: 'flex-start' }]}>
                {headerLeft ? headerLeft : (headerTitleAlign === 'center' ? <View style={styles.iconBtnPlaceholder} /> : null)}
              </View>

              <View style={styles.headerCenter}>
                <Text style={[styles.title, { textAlign: headerTitleAlign }]}>{title}</Text>
              </View>

              <View style={[styles.headerSide, { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }]}>
                {headerRight}
                <BounceCard bounceScale={0.85} onPress={onClose} style={styles.iconBtn}>
                  <X size={24} color="#1a1a1a" />
                </BounceCard>
              </View>
            </View>
          )}

          {/* Content */}
          <SafeAreaView edges={keyboardHeight > 0 ? [] : ['bottom']} style={[styles.contentContainer, dynamicHeight && { flex: undefined }, containerStyle]}>
            <ModalDragContext.Provider value={panResponder.panHandlers}>
              {children}
            </ModalDragContext.Provider>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandleContainer: { paddingVertical: 12 },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e1e4e8',
    borderRadius: 10,
    alignSelf: 'center',
    
  },
  contentContainer: {
    flex: 1,
    flexShrink: 1,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    backgroundColor: '#fff',
  },
  headerSide: {
    flex: 1,
  },
  headerCenter: {
    flex: 3,
  },
  title: {
    fontSize: 18,
    maxHeight: '100%',
    color: '#1a1a1a',
  },
  iconBtnPlaceholder: {
    width: 40,
  },
  iconBtn: {
    padding: 8,
    marginRight: -8,
  },
});
