import { useRef } from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';

interface Props extends TouchableOpacityProps {
  debounceMs?: number;
}

/**
 * Drop-in replacement for TouchableOpacity that ignores rapid double-taps.
 * Defaults to a 400ms debounce window.
 */
export default function DebouncedTouchable({ onPress, debounceMs = 400, ...props }: Props) {
  const lastPress = useRef(0);

  const handlePress = (e: any) => {
    const now = Date.now();
    if (now - lastPress.current < debounceMs) return;
    lastPress.current = now;
    onPress?.(e);
  };

  return <TouchableOpacity {...props} onPress={onPress ? handlePress : undefined} />;
}
