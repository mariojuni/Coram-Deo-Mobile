import { useRouter } from 'expo-router';
import { BounceCard } from '@/components/ui/BounceCard';
import { Save } from 'lucide-react-native';
import { Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import AppModal from '@/components/ui/AppModal';

export default function MyQRScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const qrId = userProfile?.id || currentUser?.uid || 'unknown';
  const qrName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || 'Member';
  const qrRole = userProfile?.role || 'Member';

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrId}`;

  return (
    <AppModal
      isOpen={true}
      onClose={() => router.back()}
      title="My Check-in QR Pass"
      heightRatio={0.85}
      dynamicHeight={false}
      containerStyle={{ paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#FFF5F8' }}
    >
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Show this QR code to the church staff at the welcome desk to check in.
        </Text>

        <View style={styles.qrContainer}>
          <Image source={{ uri: qrUrl }} style={styles.qrImage} />
        </View>

        <Text style={styles.name}>{qrName}</Text>
        <Text style={styles.role}>{qrRole}</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => Alert.alert('Coming soon', 'Saving to gallery will be available in a future update.')}>
            <Save size={16} color="#007AFF" />
            <Text style={styles.saveBtnText}>Save to Gallery</Text>
          </TouchableOpacity>
          <BounceCard bounceScale={0.85} style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </BounceCard>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', paddingTop: 16 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  qrContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  qrImage: { width: 200, height: 200 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  role: { fontSize: 14, fontWeight: 'bold', color: '#007AFF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 32 },
  buttonContainer: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 16 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: '#E3F2FD', gap: 8 },
  saveBtnText: { color: '#007AFF', fontWeight: 'bold' },
  doneBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: '#007AFF' },
  doneBtnText: { color: '#fff', fontWeight: 'bold' }
});
