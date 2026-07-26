import { Stack } from 'expo-router';

export default function DiscipleshipLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="week/[weekId]" />
      <Stack.Screen name="group/[groupId]" />
      <Stack.Screen name="group/[groupId]/lesson/[lessonId]" />
    </Stack>
  );
}
