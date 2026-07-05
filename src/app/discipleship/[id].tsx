import { useLocalSearchParams, Stack } from 'expo-router';
import { DiscipleshipPlanScreen } from '../../features/discipleship/presentation/screens/DiscipleshipPlanScreen';

export default function DiscipleshipPlan() {
  const { id } = useLocalSearchParams();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DiscipleshipPlanScreen planId={id as string} />
    </>
  );
}
