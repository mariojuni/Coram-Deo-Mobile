import { Stack, useRouter, useFocusEffect, usePathname } from 'expo-router';
import {
  View,
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Keyboard,
  PanResponder,
  Platform,
} from 'react-native';
import { useMemo, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { CreateSetlistProvider } from './CreateSetlistContext';

export default function CreateSetlistLayout() {
  const router = useRouter();
  const { height: windowHeight, modalPresentation, maxModalWidth } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isFormSheet = modalPresentation === 'formSheet';
  const maxSheetHeight = isFormSheet ? Math.min(windowHeight * 0.85, 780) : windowHeight * 0.85;

  const startOffset = useRef(isFormSheet ? 40 : windowHeight).current;
  const slideAnim = useMemo(() => new Animated.Value(startOffset), [startOffset]);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useFocusEffect(
    useCallback(() => {
      slideAnim.setValue(startOffset);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }, [slideAnim, fadeAnim, startOffset])
  );

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isFormSheet ? 40 : windowHeight,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (pathname.includes('select-event') || pathname.includes('assign-member')) {
        router.back();
        setTimeout(() => {
          router.back();
        }, 50);
      } else {
        router.back();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 0,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          slideAnim.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > windowHeight * 0.25 || g.vy > 1.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.overlay, isFormSheet && styles.overlayFormSheet]}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          isFormSheet && styles.sheetFormSheet,
          isFormSheet
            ? {
                maxWidth: maxModalWidth,
                height: maxSheetHeight,
                maxHeight: maxSheetHeight,
              }
            : {
                height: maxSheetHeight,
                maxHeight: maxSheetHeight,
                marginLeft: insets.left,
                marginRight: insets.right,
              },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <CreateSetlistProvider onSuccess={handleClose}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FAFAFA' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="select-event" />
          </Stack>
        </CreateSetlistProvider>

        {!isFormSheet && (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayFormSheet: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    width: '100%',
  },
  sheetFormSheet: {
    borderRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: Platform.OS === 'ios' ? 1 : 0,
    borderColor: 'rgba(0,0,0,0.08)',
    boxShadow: '0px 16px 36px rgba(0, 0, 0, 0.18)',
    elevation: 16,
  },
  dragHandleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
  },
});

