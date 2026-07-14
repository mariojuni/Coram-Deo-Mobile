import { DownloadsScreen } from '@/features/sermons/presentation/screens/DownloadsScreen';
import { Stack, useRouter } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

export default function DownloadsRoute() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top', 'bottom']}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 5 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>
      <DownloadsScreen />
    </SafeAreaView>
  );
}
