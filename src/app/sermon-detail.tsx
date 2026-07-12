import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SermonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/sermon-watch?id=${id}`} />;
}
