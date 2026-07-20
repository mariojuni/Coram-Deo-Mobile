import { X } from 'lucide-react-native';
import { BounceCard } from '@/components/ui/BounceCard';
import { ReactNode, useEffect, useMemo } from 'react';
import { Animated, Modal, StyleProp, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
}

export default function AppModal({ isOpen, onClose, title, children, containerStyle, headerLeft, headerRight, headerTitleAlign = 'center', hideHeader = false, hideDragHandle = false }: AppModalProps) {
  const slideAnim = useMemo(() => new Animated.Value(500), []);

  useEffect(() => {
    if (isOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(500); // reset when closed
    }
  }, [isOpen, slideAnim]);

  return (
    <Modal visible={isOpen} animationType="none" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {!hideDragHandle && <View style={styles.dragHandle} />}

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
          <SafeAreaView edges={['bottom']} style={[styles.contentContainer, containerStyle]}>
            {children}
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e1e4e8',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  contentContainer: {
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
    fontWeight: '700',
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
