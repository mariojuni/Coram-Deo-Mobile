import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import MyJourneyScreen from '@/features/myJourney/presentation/screens/MyJourneyScreen';

export default function MyJourneyRoute() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'My Journey',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
            color: '#111827',
          },
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: Platform.OS === 'ios' ? -8 : 8, padding: 8 }}
            >
              <ChevronLeft size={28} color="#374151" />
            </TouchableOpacity>
          ),
        }}
      />
      <MyJourneyScreen />
    </>
  );
}
