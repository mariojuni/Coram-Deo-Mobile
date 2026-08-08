
import { useRouter } from 'expo-router';
import { BounceCard } from '@/components/ui/BounceCard';
import { Plus, X, RefreshCw } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { ActionSheetIOS, Alert, Platform, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { removeVersion, checkForVersionUpdates } from '@/features/bible/data/bible.repository';
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { styles } from '@/features/bible/presentation/version-manager/styles';
import { useBibleVersionStore } from '@/store/useBibleVersionStore';
import { SoftCard } from '@/components/ui/SoftCard';
import { useEffect, useState } from 'react';

export default function MyVersionsScreen() {
  const router = useRouter();
  const { savedVersions, activeTranslation, handleSelectVersion, publishers, refreshSavedVersions } = useVersionContext();
  const [updateStatus, setUpdateStatus] = useState<Record<string, { hasUpdate: boolean; remoteVersion: number }>>({});

  useEffect(() => {
    checkForVersionUpdates().then(setUpdateStatus);
  }, [savedVersions]);

  const handleOptions = (version: any) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove from list', 'Share', 'More Info'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await removeVersion(version.id);
            await refreshSavedVersions();
          } else if (buttonIndex === 2) {
            // Share logic
          } else if (buttonIndex === 3) {
            router.push({ pathname: '/version-manager/detail', params: { bibleStr: JSON.stringify(version) } });
          }
        }
      );
    } else {
      Alert.alert(
        version.local_title || version.title,
        'Options',
        [
          { text: "Share", onPress: () => {} },
          { text: "More Info", onPress: () => {
            router.push({ pathname: '/version-manager/detail', params: { bibleStr: JSON.stringify(version) } });
          }},
          { text: "Remove from list", onPress: async () => {
            await removeVersion(version.id);
            await refreshSavedVersions();
          }, style: "destructive" },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
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
              const updateInfo = updateStatus[String(version.id)];
              const hasUpdate = updateInfo?.hasUpdate === true;
              
              return (
                <TouchableOpacity
                  key={version.id}
                  onPress={() => {
                    useBibleVersionStore.getState().setTranslation(version.id);
                    handleSelectVersion(version.id);
                    router.back();
                  }}
                  onLongPress={() => handleOptions(version)}
                  activeOpacity={0.7}
                >
                  <SoftCard 
                    style={[styles.myVersionsListItemOuter, isActive && { borderColor: '#FF6596', borderWidth: 1 }, hasUpdate && !isActive && { borderColor: '#F59E0B', borderWidth: 1 }]}
                    innerStyle={[styles.myVersionsListItemInner, isActive && { backgroundColor: 'rgba(255, 101, 150, 0.04)' }, hasUpdate && !isActive && { backgroundColor: 'rgba(245, 158, 11, 0.04)' }]}
                  >
                    <View style={[styles.myVersionsAbbrBox, isActive && { backgroundColor: 'transparent' }]}>
                      <Text style={[styles.discoverAbbrText, isActive && styles.textActive]}>{abbr}</Text>
                    </View>

                    <View style={[styles.versionInfo, { flex: 1 }]}>
                      <Text style={[styles.publisherText, isActive && { color: '#FF6596' }]}>
                        {version.publisher?.name || publishers[version.organization_id] || (version.organization_id ? 'Loading...' : 'Public Domain')}
                      </Text>
                      <Text style={[styles.versionName, isActive && styles.textActive]}>
                        {version.title || version.local_title}
                      </Text>
                    </View>

                    {hasUpdate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4, marginLeft: 8 }}>
                        <RefreshCw size={11} color="#D97706" />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706', letterSpacing: 0.3 }}>UPDATE</Text>
                      </View>
                    )}
                  </SoftCard>
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
