import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useGlobalVideoStore } from '@/store/useGlobalVideoStore';

export default function SermonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  useEffect(() => {
    if (id) {
      useGlobalVideoStore.getState().openVideo(id);
    }
  }, [id]);

  return <Redirect href="/(tabs)" />;
}
