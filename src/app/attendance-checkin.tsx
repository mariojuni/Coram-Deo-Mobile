import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BounceCard } from '@/components/ui/BounceCard';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

export default function AttendanceCheckInScreen() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <BounceCard bounceScale={0.85} style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color="#fff" />
          </BounceCard>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white' }}>Scanner is temporarily disabled.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
