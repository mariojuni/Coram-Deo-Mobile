import { CameraView, useCameraPermissions } from 'expo-camera';
import { BounceCard } from '@/components/ui/BounceCard';
import { useRouter } from 'expo-router';
import { RefreshCw, X, CheckCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { attendanceRepository } from '../features/attendance/data/attendance.repository';
import { canSelfCheckIn } from '../permissions/attendancePermissions';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { EventModel } from '../features/attendance/domain/attendance.types';

export default function AttendanceCheckInScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLoading, setScanLoading] = useState(false);
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);

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

  if (!canSelfCheckIn(userProfile)) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>You do not have permission to self check-in.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => router.back()}>
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanLoading || !userProfile?.churchId || !userProfile.memberId) return;
    setScanLoading(true);

    try {
      // Expected QR token format for events: maybe a JSON or a specific URI
      // Let's assume the QR contains the eventId directly or a session token.
      // For this implementation, let's assume it contains the eventId: `event-[eventId]`
      // If it's a web token it might be `qr-event-[eventId]`
      const match = data.match(/event-([a-zA-Z0-9_-]+)/i);
      if (!match || !match[1]) {
        Alert.alert("Invalid QR", "This QR code is not recognized as a valid Event Check-In code.");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }
      
      const eventId = match[1];

      // Fetch Event from events collection
      const eventRef = doc(db, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        Alert.alert("Error", "Event not found.");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }

      const eventData = eventSnap.data() as EventModel;

      // Validate Event
      if (eventData.churchId !== userProfile.churchId) {
        Alert.alert("Error", "This event belongs to a different church.");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }

      if (!eventData.attendanceEnabled) {
        Alert.alert("Notice", "Attendance is not enabled for this event.");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }

      if (eventData.attendanceMode === 'manual' || eventData.attendanceMode === 'staff_scan') {
        Alert.alert("Notice", "Self check-in is not allowed for this event.");
        setTimeout(() => setScanLoading(false), 2000);
        return;
      }

      // Check-in window validation
      if (eventData.checkInWindowStart && eventData.checkInWindowEnd) {
        const now = new Date().getTime();
        const start = new Date(eventData.checkInWindowStart).getTime();
        const end = new Date(eventData.checkInWindowEnd).getTime();
        if (now < start) {
          Alert.alert("Notice", "Check-in is not yet open for this event.");
          setTimeout(() => setScanLoading(false), 2000);
          return;
        }
        if (now > end) {
          Alert.alert("Notice", "Check-in is closed for this event.");
          setTimeout(() => setScanLoading(false), 2000);
          return;
        }
      }

      // Record attendance
      try {
        await attendanceRepository.createAttendanceRecord({
          churchId: userProfile.churchId,
          eventId: eventId,
          eventTitle: eventData.title,
          memberId: userProfile.memberId,
          status: 'Present',
          checkInMethod: 'self_qr',
          checkedInAt: new Date().toISOString(),
          checkedInBy: 'self',
          source: 'mobile',
          memberName: `${userProfile.name || userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
          type: userProfile.role || 'Member',
        });

        Alert.alert("Success", "You are checked in. Thank you for attending!");
        setTimeout(() => {
          setScanLoading(false);
          router.back();
        }, 2000);
      } catch (e: any) {
        if (e.message.includes('Already checked in')) {
          Alert.alert("Notice", "You are already checked in for this event.");
        } else {
          throw e;
        }
        setTimeout(() => setScanLoading(false), 2000);
      }
    } catch (err) {
      console.error("Error processing QR:", err);
      Alert.alert("Error", "Could not complete check-in.");
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
        <View style={styles.footer}>
           <Text style={styles.footerText}>Scan the Event QR Code to Check In</Text>
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
  loadingText: { color: '#fff', fontWeight: 'bold' },
  footer: { padding: 24, alignItems: 'center' },
  footerText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
