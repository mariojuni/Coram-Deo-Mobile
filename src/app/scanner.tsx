import { CameraView, useCameraPermissions } from 'expo-camera';
import { BounceCard } from '@/components/ui/BounceCard';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { RefreshCw, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { useMemberStore } from '../store/useMemberStore';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLoading, setScanLoading] = useState(false);
  const router = useRouter();
  const members = useMemberStore((state) => state.members);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanLoading) return;
    setScanLoading(true);

    try {
      // Parse format qr-[id]
      const match = data.match(/qr-([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) {
        Alert.alert("Invalid QR", "Does not match system signature.");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }
      
      const memberId = match[1];
      const foundMember = members.find((m: any) => m.id === memberId);
      
      if (foundMember) {
        // Query firestore to check if already checked in today
        const checkinsRef = collection(db, 'attendance');
        const q = query(
          checkinsRef, 
          where('userId', '==', memberId),
          where('date', '==', getTodayStr()),
          where('type', '==', 'member')
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          Alert.alert("Notice", `⚠️ ${foundMember.name} is already checked in for today.`);
          setTimeout(() => setScanLoading(false), 3000);
          return;
        }

        // Write checkin record
        await addDoc(checkinsRef, {
          userId: foundMember.id,
          name: foundMember.name,
          role: foundMember.role,
          status: foundMember.status,
          date: getTodayStr(),
          timestamp: serverTimestamp(),
          type: 'member'
        });

        Alert.alert("Success", `🎉 ${foundMember.name} checked in successfully!`);
        setTimeout(() => setScanLoading(false), 3000);
      } else {
        Alert.alert("Not Found", "Member signature not found in system directory.");
        setTimeout(() => setScanLoading(false), 3000);
      }
    } catch (err) {
      console.error("Error decoding QR:", err);
      Alert.alert("Error", "Error processing QR Code.");
      setTimeout(() => setScanLoading(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFill} 
        facing="back"
        onBarcodeScanned={scanLoading ? undefined : handleBarcodeScanned}
      />
      
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <BounceCard bounceScale={0.85} style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color="#fff" />
          </BounceCard>
        </View>

        <View style={styles.targetContainer}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          
          {scanLoading && (
            <View style={styles.loadingBox}>
              <RefreshCw size={32} color="#fff" style={styles.spinner} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  permissionText: { color: '#fff', fontSize: 16, marginBottom: 16 },
  permissionButton: { backgroundColor: '#4ADE80', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  permissionButtonText: { color: '#000', fontWeight: 'bold' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  targetContainer: { position: 'absolute', top: '50%', left: '50%', width: 250, height: 250, marginLeft: -125, marginTop: -125, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#4ADE80' },
  topLeft: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 },
  topRight: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 24 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 24 },
  loadingBox: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 16, alignItems: 'center' },
  spinner: { marginBottom: 8 },
  loadingText: { color: '#fff', fontWeight: 'bold' }
});
