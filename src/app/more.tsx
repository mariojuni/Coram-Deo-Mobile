import { useRouter } from 'expo-router';
import { BarChart2, BookOpen, ChevronLeft, ChevronRight, ListChecks, MessageCircle, Settings, Users, Wallet } from 'lucide-react-native';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export default function MoreScreen() {
  const router = useRouter();
  const userProfile = useAuthStore((state) => state.userProfile);
  
  const currentUser = useAuthStore((state) => state.currentUser);
  const displayName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || 'User';
  // Use primaryRole for display; fall back to first systemRole then legacy role field.
  const primaryRoleRaw =
    userProfile?.primaryRole ||
    (Array.isArray(userProfile?.systemRoles) && userProfile.systemRoles.length > 0
      ? userProfile.systemRoles[0]
      : undefined) ||
    userProfile?.role ||
    'viewer';
  const displayRole = String(primaryRoleRaw).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const hasChurchId = Boolean(userProfile?.churchId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#1a1a1a" />
          <Text style={styles.title}>More</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=11' }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileRole}>{displayRole}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <Settings size={20} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
              <Users size={20} color="#4D8BFF" />
            </View>
            <Text style={styles.menuText}>Ministries</Text>
            <ChevronRight size={20} color="#ccc" />
          </TouchableOpacity>

          {hasChurchId && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/bible-plans' as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FFF0F5' }]}>
                <BookOpen size={20} color="#FF6596" />
              </View>
              <Text style={styles.menuText}>Bible Plans</Text>
              <ChevronRight size={20} color="#ccc" />
            </TouchableOpacity>
          )}

          {hasChurchId && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/bible-plans' as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
                <ListChecks size={20} color="#22C55E" />
              </View>
              <Text style={styles.menuText}>My Bible Progress</Text>
              <ChevronRight size={20} color="#ccc" />
            </TouchableOpacity>
          )}

          {hasChurchId && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/my-giving' as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FFF0F5' }]}>
                <Wallet size={20} color="#FF6596" />
              </View>
              <Text style={styles.menuText}>My Giving</Text>
              <ChevronRight size={20} color="#ccc" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
              <MessageCircle size={20} color="#8B6FE8" />
            </View>
            <Text style={styles.menuText}>Communications</Text>
            <ChevronRight size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <BarChart2 size={20} color="#4ADE80" />
            </View>
            <Text style={styles.menuText}>Reports</Text>
            <ChevronRight size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F8' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16,
    backgroundColor: '#FFF5F8'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginLeft: 8 },
  content: { flex: 1, paddingHorizontal: 24 },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  profileRole: { fontSize: 14, color: '#666', marginTop: 4 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  menuText: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' }
});
