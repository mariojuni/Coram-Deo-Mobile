
import { useRouter } from 'expo-router';
import { BounceCard } from '@/components/ui/BounceCard';
import { Plus, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { ActionSheetIOS, Alert, Platform, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { removeVersion } from '@/features/bible/data/bible.repository';
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { styles } from '@/features/bible/presentation/version-manager/styles';
import { useBibleVersionStore } from '@/store/useBibleVersionStore';

export default function MyVersionsScreen() {
  const router = useRouter();
  const { savedVersions, activeTranslation, handleSelectVersion, publishers, refreshSavedVersions } = useVersionContext();

  const handleRemove = async (id: string | number) => {
    Alert.alert(
      "Remove Version",
      "Are you sure you want to remove this downloaded version?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            await removeVersion(id);
            await refreshSavedVersions();
            if (String(activeTranslation) === String(id) && savedVersions.length > 1) {
               const remaining = savedVersions.filter((v: any) => String(v.id) !== String(id));
               await handleSelectVersion(remaining[0].id);
            }
          }
        }
      ]
    );
  };

  const handleOptions = (version: any) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Share', 'More Info', 'Remove from list'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Share
          } else if (buttonIndex === 2) {
            router.push({ pathname: '/version-manager/detail', params: { bibleStr: JSON.stringify(version) } });
          } else if (buttonIndex === 3) {
            handleRemove(version.id);
          }
        }
      );
    } else {
      Alert.alert(
        "Options",
        version.title || version.local_title,
        [
          { text: "Share", onPress: () => {} },
          { text: "More Info", onPress: () => {
            router.push({ pathname: '/version-manager/detail', params: { bibleStr: JSON.stringify(version) } });
          }},
          { text: "Remove from list", onPress: () => handleRemove(version.id), style: "destructive" },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.headerContainer, { paddingTop: 21 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <View style={{ minWidth: 40, alignItems: 'flex-start' }}>
            <TouchableOpacity onPress={() => router.push('/version-manager/discover')} style={{ padding: 4 }}>
              <Plus size={26} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalTitle, { marginHorizontal: 12, fontSize: 16 }]}>My Versions</Text>
          <View style={{ minWidth: 40, alignItems: 'flex-end' }}>
            <BounceCard 
              bounceScale={0.85} 
              style={styles.headerCircle} 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/bible');
                }
              }} 
              hitSlop={8} 
              activeOpacity={0.8}
            >
              <X size={24} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 95 }}>
        <View style={styles.discoverListContainer}>
          {savedVersions.length === 0 ? (
            <Text style={styles.emptyText}>No versions saved yet. Click + to find translations.</Text>
          ) : (
            savedVersions.map((version: any) => {
              const isActive = String(version.id) === String(activeTranslation);
              const abbr = String(version.local_abbreviation || version.abbreviation || version.id || '').replace(/(\d{2,})$/, '\n$1');
              
              return (
                <TouchableOpacity
                  key={version.id}
                  style={[
                    styles.myVersionsListItem,
                    isActive && { backgroundColor: 'rgba(255, 101, 150, 0.04)', borderColor: '#FF6596', borderWidth: 1 }
                  ]}
                  onPress={() => {
                    useBibleVersionStore.getState().setTranslation(version.id);
                    handleSelectVersion(version.id); // sync context too
                    router.back();
                  }}
                  onLongPress={() => handleOptions(version)}
                  activeOpacity={0.7}
                >
                    <View style={[styles.myVersionsAbbrBox, isActive && { backgroundColor: 'transparent' }]}>
                      <Text style={[styles.discoverAbbrText, isActive && styles.textActive]}>{abbr}</Text>
                    </View>

                  <View style={styles.versionInfo}>
                    <Text style={[styles.publisherText, isActive && { color: '#FF6596' }]}>
                      {publishers[version.organization_id] || (version.organization_id ? 'Loading...' : 'Public Domain')}
                    </Text>
                    <Text style={[styles.versionName, isActive && styles.textActive]}>
                      {version.title || version.local_title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          
          <View style={{ marginTop: 24, alignItems: 'center', paddingBottom: 32 }}>
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(255,101,150,0.1)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 }}
              onPress={() => router.push('/version-manager/discover')}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FF6596', fontWeight: '700', fontSize: 14 }}>More Versions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
