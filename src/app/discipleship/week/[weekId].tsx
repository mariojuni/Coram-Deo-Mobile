import { useLocalSearchParams, Stack } from 'expo-router';
import { DiscipleshipWeekScreen } from '../../../features/discipleship/presentation/screens/DiscipleshipWeekScreen';

export default function DiscipleshipWeek() {
  const { weekId, planId, groupId } = useLocalSearchParams();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DiscipleshipWeekScreen weekId={weekId as string} planId={planId as string} groupId={groupId as string} />
    </>
  );
}
