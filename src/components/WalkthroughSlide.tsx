import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Image } from 'react-native';
import { LucideIcon } from 'lucide-react-native';


interface WalkthroughSlideProps {
  title: string;
  description: string;
  Icon?: LucideIcon;
  imageSource?: any;
}

export default function WalkthroughSlide({ title, description, Icon, imageSource }: WalkthroughSlideProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      {imageSource ? (
        <View style={styles.imageContainer}>
          <Image source={imageSource} style={styles.image} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.iconContainer}>
          {Icon && <Icon size={70} color="#FF6596" strokeWidth={1.5} />}
        </View>
      )}
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
    backgroundColor: 'rgba(255, 101, 150, 0.1)',
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
  imageContainer: {
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 220,
    height: 220,
  }
});
