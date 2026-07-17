import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

interface CommentButtonProps {
  count?: number;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'icon-only' | 'default';
  color?: string;
  size?: number;
}

export function CommentButton({ count = 0, onPress, disabled = false, variant = 'default', color = '#4B5563', size = 22 }: CommentButtonProps) {
  if (variant === 'icon-only') {
    return (
      <TouchableOpacity 
        style={[styles.iconBtn, disabled && styles.disabled]} 
        onPress={onPress} 
        activeOpacity={0.8}
        disabled={disabled}
      >
        <MessageCircle size={size} color={color} />
        {count > 0 && (
          <Text style={[styles.badgeText, { color }]}>{count}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, disabled && styles.disabled]} 
      onPress={onPress} 
      activeOpacity={0.8}
      disabled={disabled}
    >
      <MessageCircle size={size} color={color} />
      <Text style={[styles.text, { color }]}>
        {count > 0 ? `${count} ${count === 1 ? 'Comment' : 'Comments'}` : 'Comment'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
