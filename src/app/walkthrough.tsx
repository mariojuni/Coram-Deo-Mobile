import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, SafeAreaView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Church, BookOpen, Users, Key } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WalkthroughSlide from '../components/WalkthroughSlide';
import { AuthGeometricHeader } from '../components/ui/AuthGeometricHeader';
import { PrimaryGradientButton } from '../components/ui/PrimaryGradientButton';

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to Coram Deo',
    description: 'Stay connected with worship, sermons, events, prayer, and church updates.',
    imageSource: require('../../assets/images/logo.png'),
  },
  {
    id: '2',
    title: 'Grow in God’s Word',
    description: 'Follow Bible reading plans, continue daily reading, and grow together.',
    Icon: BookOpen,
  },
  {
    id: '3',
    title: 'Serve and Participate',
    description: 'View ministry schedules, assignments, church events, and attendance updates.',
    Icon: Users,
  },
  {
    id: '4',
    title: 'Church Access',
    description: 'Some features require your account to be linked to your church member profile. If you are already in the member directory, your account may be linked automatically. If not, a church admin can add or link your profile.',
    Icon: Key,
  },
];

export default function WalkthroughScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleComplete = async (route: '/(auth)/login' | '/(auth)/register') => {
    try {
      await AsyncStorage.setItem('hasSeenWalkthrough', 'true');
      router.replace(route);
    } catch (e) {
      console.error('Failed to save walkthrough state', e);
      router.replace(route);
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 50 }), []);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Soft geometric background matching systems design - hidden for now */}
      {/* <AuthGeometricHeader /> */}
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {!isLastSlide ? (
            <TouchableOpacity onPress={() => handleComplete('/(auth)/login')} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WalkthroughSlide title={item.title} description={item.description} Icon={item.Icon} imageSource={item.imageSource} />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        <View style={styles.footer}>
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {isLastSlide ? (
              <View style={styles.authButtonsContainer}>
                <PrimaryGradientButton
                  title="Create Account"
                  onPress={() => handleComplete('/(auth)/register')}
                  style={{ marginBottom: 16 }}
                  textStyle={{ fontSize: 18 }}
                />
                
                <TouchableOpacity onPress={() => handleComplete('/(auth)/login')} activeOpacity={0.8} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>Log In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <PrimaryGradientButton
                title="Next"
                onPress={handleNext}
                textStyle={{ fontSize: 18 }}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
  },
  skipButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  skipPlaceholder: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FF6596',
  },
  actionContainer: {
    minHeight: 140, // To keep consistent height when changing to 2 buttons
    justifyContent: 'flex-end',
  },
  authButtonsContainer: {
    width: '100%',
  },
  gradientButton: {
    height: 56,
    borderRadius: 28, // fully rounded like a pill
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#FF6596',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  gradientButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  outlineButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  outlineButtonText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
