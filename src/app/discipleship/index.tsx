import { DiscipleshipListScreen } from '../../features/discipleship/presentation/screens/DiscipleshipListScreen';
import { Stack } from 'expo-router';

export default function DiscipleshipIndex() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DiscipleshipListScreen />
    </>
  );
}
