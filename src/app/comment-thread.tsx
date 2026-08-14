import React, { useMemo } from 'react';
import { Stack } from 'expo-router';
import { CommentThreadScreen } from '@/features/comments/presentation/screens/CommentThreadScreen';

export default function CommentThreadRoute() {
  const options = useMemo(() => ({ headerShown: false }), []);
  return (
    <>
      <Stack.Screen options={options} />
      <CommentThreadScreen />
    </>
  );
}
