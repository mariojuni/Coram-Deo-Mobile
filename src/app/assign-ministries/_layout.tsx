import { Stack, useRouter } from 'expo-router';
import { Dimensions, View, Animated, TouchableWithoutFeedback } from 'react-native';
import { useEffect, useMemo } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AssignMinistriesLayout() {
  const router = useRouter();
  const slideAnim = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);
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
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Go back to previous screen
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/attendance');
      }
    });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }} />
      </TouchableWithoutFeedback>

      <Animated.View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_HEIGHT * 0.9, overflow: 'hidden', transform: [{ translateY: slideAnim }] }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FAFAFA' }
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="assign-member" />
        </Stack>
      </Animated.View>
    </View>
  );
}
