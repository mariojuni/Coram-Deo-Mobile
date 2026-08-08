import { saveVersion } from '@/features/bible/data/bible.repository';
import { bibleDataService } from '@/features/bible/data/BibleDataService';
import { BounceCard } from '@/components/ui/BounceCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft, CloudDownload, Globe2, HardDrive, RefreshCw, ShieldCheck, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { styles } from '@/features/bible/presentation/version-manager/styles';
import { redownloadVersion } from '@/features/bible/data/bible.repository';
import { doc, getDoc } from 'firebase/firestore';
import { getActiveDb } from '@/firebase';

export default function VersionDetailScreen() {
  const router = useRouter();
  const { bibleStr } = useLocalSearchParams();
  const bible = bibleStr ? JSON.parse(bibleStr as string) : null;
  const { savedVersions, refreshSavedVersions, publishers } = useVersionContext();
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; remoteVersion: number } | null>(null);

  const localVersion: number = bible?._localContentVersion ?? 0;

  useEffect(() => {
    if (!bible) return;
    const id = String(bible.id);
    getDoc(doc(getActiveDb(), 'bibleVersions', id))
      .then((snap) => {
        if (snap.exists()) {
          const remoteVersion: number = snap.data().contentVersion ?? 1;
          setUpdateInfo({ hasUpdate: remoteVersion > localVersion, remoteVersion });
        }
      })
      .catch(() => {});
  }, [bible?.id]);

  if (!bible) return null;

  const isDownloaded = savedVersions.map((v: any) => String(v.id)).includes(String(bible.id));
  const abbr = String(bible.abbreviation || bible.localized_abbreviation || bible.id || '');
  const publisherName = bible.publisher?.name || publishers[bible.organization_id] || (bible.organization_id ? 'Loading...' : 'Public Domain');

  // Estimate download size from chapterCount (~3.5 KB per chapter of Firestore JSON text)
  const chapterCount: number = bible.chapterCount ?? bible.chapter_count ?? 0;
  const estimatedBytes = chapterCount > 0 ? chapterCount * 3584 : 1189 * 3584; // fallback: full Bible
  const estimatedMB = estimatedBytes / (1024 * 1024);
  const sizeLabel = estimatedMB < 1
    ? `~${Math.round(estimatedMB * 1024)} KB`
    : `~${estimatedMB.toFixed(1)} MB`;

  const handleDownload = async () => {
    if (isDownloaded && !updateInfo?.hasUpdate) return;

    setIsDownloading(true);

    if (isDownloaded && updateInfo?.hasUpdate) {
      // Re-download to apply update
      const success = await redownloadVersion(bible.id, updateInfo.remoteVersion);
      if (success) {
        await refreshSavedVersions();
        setUpdateInfo({ hasUpdate: false, remoteVersion: updateInfo.remoteVersion });
        Alert.alert('Updated!', `Bible updated to version ${updateInfo.remoteVersion}.`);
      } else {
        Alert.alert('Error', 'Failed to update. Please try again.');
      }
    } else {
      const success = await bibleDataService.downloadVersion(bible.id);
      if (success) {
        await saveVersion(bible);
        await refreshSavedVersions();
        Alert.alert('Success', 'Bible downloaded successfully!');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to start download. Please try again.');
      }
    }

    setIsDownloading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'space-between' }} edges={['top', 'bottom']}>
      <View style={[styles.modalHeader, { backgroundColor: '#FAFAFA', borderBottomWidth: 0, zIndex: 10 }]}>
        <View style={styles.headerLeftContainer}>
          <BounceCard bounceScale={0.85} onPress={() => router.back()} style={{ padding: 8, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </BounceCard>
        </View>
        <Text style={[styles.modalTitle, { opacity: 0 }]}>Version Info</Text>
        <View style={styles.headerRightContainer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        
        {/* Modern Hero Section */}
        <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 32 }}>
          <LinearGradient
            colors={['#FF6596', '#FF8FB0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#FF6596', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10, transform: [{ rotate: '-5deg' }] }}
          >
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', transform: [{ rotate: '5deg' }] }}>{abbr}</Text>
          </LinearGradient>
          
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#1a1a1a', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5, lineHeight: 36 }}>
            {bible.title || bible.localized_title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 101, 150, 0.08)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6 }}>
              <ShieldCheck size={16} color="#FF6596" />
              <Text style={{ fontSize: 13, color: '#FF6596', fontWeight: '700' }}>{publisherName}</Text>
            </View>

            {bible.language && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6 }}>
                <Globe2 size={16} color="#666" />
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>{bible.language.name || bible.language.name_local}</Text>
              </View>
            )}

            {!isDownloaded && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6 }}>
                <HardDrive size={14} color="#6366F1" />
                <Text style={{ fontSize: 13, color: '#6366F1', fontWeight: '700' }}>{sizeLabel}</Text>
              </View>
            )}

            {isDownloaded && updateInfo?.hasUpdate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6 }}>
                <Zap size={14} color="#D97706" />
                <Text style={{ fontSize: 13, color: '#D97706', fontWeight: '800' }}>v{updateInfo.remoteVersion} Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 3 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16, letterSpacing: -0.3 }}>About this Version</Text>
            <Text style={{ fontSize: 16, lineHeight: 28, color: '#555', letterSpacing: 0.2 }}>
              {bible.description || bible.localized_description || 'No detailed description is available for this version yet. This translation provides a faithful rendering of the original texts.'}
            </Text>
          </View>
        </View>

      </ScrollView>

        {/* Floating Action Bar */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <LinearGradient
            colors={['rgba(250,250,250,0)', 'rgba(250,250,250,0.9)', '#FAFAFA']}
            style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 40 }}
          >
            {!isDownloaded && !isDownloading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
                <HardDrive size={12} color="#999" />
                <Text style={{ fontSize: 12, color: '#999', fontWeight: '500' }}>
                  Estimated download: {sizeLabel}
                </Text>
              </View>
            )}

            {isDownloaded && updateInfo?.hasUpdate && !isDownloading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
                <RefreshCw size={12} color="#D97706" />
                <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600' }}>
                  Your local copy is outdated — tap to update
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[{ flexDirection: 'row', backgroundColor: '#1a1a1a', paddingVertical: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
                (isDownloaded && !updateInfo?.hasUpdate || isDownloading) && { backgroundColor: '#F0F0F0', shadowOpacity: 0, elevation: 0, opacity: isDownloaded && !updateInfo?.hasUpdate ? 0.8 : 1 },
                isDownloaded && updateInfo?.hasUpdate && { backgroundColor: '#D97706' },
              ]}
              onPress={handleDownload}
              disabled={(isDownloaded && !updateInfo?.hasUpdate) || isDownloading}
              activeOpacity={0.8}
            >
              {isDownloading ? (
                <ActivityIndicator color="#999" style={{ marginRight: 10 }} />
              ) : isDownloaded && updateInfo?.hasUpdate ? (
                <RefreshCw size={22} color="#fff" style={{ marginRight: 10 }} />
              ) : isDownloaded ? (
                <CheckCircle size={22} color="#4ADE80" style={{ marginRight: 10 }} />
              ) : (
                <CloudDownload size={22} color="#fff" style={{ marginRight: 10 }} />
              )}
              <Text style={[{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
                (isDownloaded && !updateInfo?.hasUpdate || isDownloading) && { color: '#999' },
              ]}>
                {isDownloading
                  ? (updateInfo?.hasUpdate ? 'Updating...' : 'Downloading...')
                  : isDownloaded && updateInfo?.hasUpdate
                  ? `Update to v${updateInfo.remoteVersion}`
                  : isDownloaded
                  ? 'Downloaded'
                  : 'Download to Device'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
    </SafeAreaView>
  );
}
