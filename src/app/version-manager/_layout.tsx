

import { Stack, useRouter } from 'expo-router';
import { View, Animated, TouchableWithoutFeedback, StyleSheet, useWindowDimensions, PanResponder } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VersionManagerLayout() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Use a ref to store the current window height so the animation doesn't jump on rotate
  const startHeight = useRef(windowHeight).current;
  
  const slideAnim = useMemo(() => new Animated.Value(startHeight), [startHeight]);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
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
  }, [slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: windowHeight,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
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
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }} />
      </TouchableWithoutFeedback>

      <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: windowHeight * 0.9, overflow: 'hidden', marginLeft: insets.left, marginRight: insets.right, transform: [{ translateY: slideAnim }] }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' }
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="discover" />
          <Stack.Screen name="language" />
          <Stack.Screen name="detail" />
        </Stack>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }} {...panResponder.panHandlers}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dragHandleContainer: { 
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e1e4e8',
    borderRadius: 10,
  },
});
