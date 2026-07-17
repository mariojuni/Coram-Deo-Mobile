import { useRouter } from 'expo-router';
import { Save, X } from 'lucide-react-native';
import { Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';

export default function MyQRScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const qrId = userProfile?.id || currentUser?.uid || 'unknown';
  const qrName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || 'Member';
  const qrRole = userProfile?.role || 'Member';

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrId}`;



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Check-in QR Pass</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Show this QR code to the church staff at the welcome desk to check in.
      </Text>

      <View style={styles.qrContainer}>
        <Image source={{ uri: qrUrl }} style={styles.qrImage} />
      </View>

      <Text style={styles.name}>{qrName}</Text>
      <Text style={styles.role}>{qrRole}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveBtn}>
          <Save size={16} color="#007AFF" />
          <Text style={styles.saveBtnText}>Save to Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F8', alignItems: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24, paddingTop: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e1e4e8', alignItems: 'center', justifyContent: 'center' },
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
