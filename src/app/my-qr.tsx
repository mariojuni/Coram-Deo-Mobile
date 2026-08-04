import { useRouter } from 'expo-router';
import { BounceCard } from '@/components/ui/BounceCard';
import { Download, X } from 'lucide-react-native';
import { Image, StyleSheet, Text, View, Alert, ScrollView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import AppModal from '@/components/ui/AppModal';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';

export default function MyQRScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const qrId = userProfile?.id || currentUser?.uid || 'unknown';
  const qrName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || 'Member';
  const qrRole = userProfile?.role || 'Member';

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrId}`;

  const handleSaveToGallery = () => {
    Alert.alert('Coming soon', 'Saving to gallery will be available in a future update.');
  };

  return (
    <AppModal
      isOpen={true}
      onClose={() => router.back()}
      title="My Check-in QR Pass"
      hideHeader={true}
      hideDragHandle={true}
      heightRatio={0.85}
      dynamicHeight={false}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0, backgroundColor: '#FFFFFF' }}
    >
      <LinearGradient colors={['#F3F9FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />

      <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.dragHandle} />
        <View style={styles.headerContent}>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={handleSaveToGallery} hitSlop={8} activeOpacity={0.8}>
            <Download size={20} color="#007AFF" strokeWidth={2.5} />
          </BounceCard>
          <Text style={styles.headerTitle}>My QR Pass</Text>
          <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => router.back()} hitSlop={8} activeOpacity={0.8}>
            <X size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 80 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Show this QR code to the church staff at the welcome desk to check in.
          </Text>

          <View style={styles.qrCard}>
            <View style={styles.qrContainer}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.name}>{qrName}</Text>
              <Text style={styles.role}>{qrRole}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#d1d5db',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerCircle: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 12,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  content: { flex: 1, alignItems: 'center', paddingTop: 20 },
  
  subtitle: { 
    fontSize: 15, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginBottom: 32, 
    lineHeight: 22,
    paddingHorizontal: 16
  },
  
  qrCard: {
    ...(getSoftShadowStyle(20) as any),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  qrContainer: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#F3F4F6' 
  },
  qrImage: { width: 220, height: 220 },
  
  userInfo: {
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 20,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  role: { fontSize: 13, fontWeight: '700', color: '#007AFF', textTransform: 'uppercase', letterSpacing: 1 },
});
