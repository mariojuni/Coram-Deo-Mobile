import { Stack, useRouter, useFocusEffect, usePathname } from 'expo-router';
import { Dimensions, View, Animated, TouchableWithoutFeedback, StyleSheet, Keyboard } from 'react-native';
import { useEffect, useMemo, useCallback } from 'react';
import { CreateSetlistProvider } from './CreateSetlistContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateSetlistLayout() {
  const router = useRouter();
  const slideAnim = useMemo(() => new Animated.Value(SCREEN_HEIGHT), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);

  useFocusEffect(
    useCallback(() => {
      slideAnim.setValue(SCREEN_HEIGHT);
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
    }, [slideAnim, fadeAnim])
  );

  const pathname = usePathname();

  const handleClose = () => {
    Keyboard.dismiss();
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
      // Manually pop out of the nested screen and then pop the modal
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

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }} />
      </TouchableWithoutFeedback>

      <Animated.View style={{ backgroundColor: '#FAFAFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_HEIGHT * 0.85, overflow: 'hidden', transform: [{ translateY: slideAnim }] }}>
        <CreateSetlistProvider onSuccess={handleClose}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FAFAFA' }
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="select-event" />
          </Stack>
        </CreateSetlistProvider>
      </Animated.View>
    </View>
  );
}

