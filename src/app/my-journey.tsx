import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import MyJourneyScreen from '@/features/myJourney/presentation/screens/MyJourneyScreen';

export default function MyJourneyRoute() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MyJourneyScreen />
    </>
  );
}
