import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="account-security" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="highlighted-verses" options={{ headerShown: false }} />
    </Stack>
  );
}
