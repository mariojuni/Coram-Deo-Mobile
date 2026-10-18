import React from 'react';
import { Stack } from 'expo-router';
import MyJourneyScreen from '@/features/myJourney/presentation/screens/MyJourneyScreen';

export default function MyJourneyRoute() {

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MyJourneyScreen />
    </>
  );
}
