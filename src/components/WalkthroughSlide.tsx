import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface WalkthroughSlideProps {
  title: string;
  description: string;
  Icon: LucideIcon;
}

export default function WalkthroughSlide({ title, description, Icon }: WalkthroughSlideProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      <LinearGradient
        colors={['#4D8BFF', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Icon size={70} color="#ffffff" strokeWidth={1.5} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
});
