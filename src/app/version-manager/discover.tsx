
import { bibleDataService } from '@/features/bible/data/BibleDataService';
import { BounceCard } from '@/components/ui/BounceCard';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Cloud, Globe, Search, RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { styles } from '@/features/bible/presentation/version-manager/styles';

import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';

const CustomCloud = ({ size = 24, color = '#ccc' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      opacity="0.4"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.15771 10.3223C4.88874 10.3427 3.05469 11.8664 3.05469 14.4623C3.05469 16.1416 4.0549 17.5875 5.49101 18.2364C6.09523 18.4816 6.6975 18.576 7.1548 18.576H16.9487C17.406 18.576 18.0103 18.4865 18.6223 18.2413C20.0584 17.5923 21.0547 16.1416 21.0547 14.4623C21.0547 11.8664 19.2216 10.3427 16.9526 10.3223C16.9526 8.68961 15.6712 5.42432 12.0547 5.42432C8.43815 5.42432 7.15771 8.68961 7.15771 10.3223Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloudDownload = ({ size = 24, color = '#D97706' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d="M7.5972 5.93261C8.49457 4.74647 9.9306 3.7979 12 3.7979C14.0694 3.7979 15.5054 4.74647 16.4028 5.93261C17.0817 6.83002 17.4565 7.86576 17.5901 8.73983C18.6302 8.87036 19.5832 9.29671 20.3196 10.0021C21.2224 10.8669 21.75 12.1038 21.75 13.5868C21.75 15.5713 20.5685 17.2785 18.8724 18.0445C18.4948 18.215 18.0506 18.0472 17.8801 17.6697C17.7097 17.2921 17.8775 16.8479 18.255 16.6774C19.433 16.1455 20.25 14.961 20.25 13.5868C20.25 12.4739 19.8625 11.6413 19.282 11.0853C18.696 10.5241 17.8634 10.1972 16.8967 10.1968C16.4826 10.1966 16.147 9.8609 16.147 9.44681C16.147 8.78795 15.8767 7.72337 15.2066 6.83762C14.5596 5.98245 13.5471 5.2979 12 5.2979C10.4529 5.2979 9.4404 5.98245 8.79342 6.83762C8.1233 7.72337 7.85303 8.78795 7.85303 9.44681C7.85303 9.85852 7.52115 10.1933 7.10946 10.1968C6.13987 10.2051 5.30495 10.5332 4.71806 11.0932C4.13756 11.6472 3.75 12.4749 3.75 13.5868C3.75 14.961 4.56699 16.1455 5.745 16.6774C6.12251 16.8479 6.29034 17.2921 6.11986 17.6697C5.94938 18.0472 5.50515 18.215 5.12765 18.0445C3.4315 17.2785 2.25 15.5713 2.25 13.5868C2.25 12.1029 2.77898 10.8703 3.68251 10.0081C4.41942 9.30484 5.37188 8.87971 6.40925 8.74411C6.54225 7.86914 6.91715 6.83148 7.5972 5.93261Z" fill={color}></Path>
    <Path fillRule="evenodd" clipRule="evenodd" d="M12 11.707C12.4142 11.707 12.75 12.0428 12.75 12.457L12.7503 19.4515C12.7504 19.8657 12.4146 20.2015 12.0004 20.2016C11.5862 20.2016 11.2504 19.8658 11.2503 19.4516L11.25 12.4571C11.25 12.0429 11.5858 11.7071 12 11.707Z" fill={color}></Path>
    <Path fillRule="evenodd" clipRule="evenodd" d="M8.69819 16.1494C8.99108 15.8565 9.46595 15.8565 9.75885 16.1494L11.9995 18.3901L14.2402 16.1494C14.5331 15.8565 15.008 15.8565 15.3009 16.1494C15.5938 16.4423 15.5938 16.9171 15.3009 17.21L12.5299 19.981C12.237 20.2739 11.7621 20.2739 11.4692 19.981L8.69819 17.21C8.40529 16.9171 8.40529 16.4423 8.69819 16.1494Z" fill={color}></Path>
  </Svg>
);

export default function DiscoverVersionsScreen() {
  const router = useRouter();
  const { savedVersions, selectedLanguage, publishers } = useVersionContext();
  const downloadedIds = savedVersions.map((v: any) => String(v.id));

  const [bibles, setBibles] = useState<any[]>([]);
  const [biblesLoading, setBiblesLoading] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');

  useEffect(() => {
    if (selectedLanguage) {
      const loadBibles = async () => {
        setBiblesLoading(true);
        const fetchedBibles = await bibleDataService.getVersions(selectedLanguage.tag || selectedLanguage.id);
        setBibles(fetchedBibles);
        setBiblesLoading(false);
      };
      loadBibles();
    }
  }, [selectedLanguage]);

  let displayBibles = bibles;
  if (discoverSearch.trim()) {
    const lower = discoverSearch.toLowerCase().trim();
    displayBibles = bibles.filter(b => 
      (b.title || b.localized_title || '').toLowerCase().includes(lower) ||
      (b.abbreviation || b.localized_abbreviation || '').toLowerCase().includes(lower)
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={[styles.headerContainer, { paddingTop: 21 }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        <View style={styles.headerContent}>
          <BounceCard 
            bounceScale={0.85} 
            style={styles.headerCircle} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/version-manager');
              }
            }} 
            hitSlop={8} 
            activeOpacity={0.8}
          >
            <ChevronLeft size={24} color="#111827" strokeWidth={2} />
          </BounceCard>
          <Text style={[styles.modalTitle, { fontSize: 16, marginHorizontal: 12, flex: 1, textAlign: 'center' }]}>Discover Versions</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.searchContainer, { marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.5)' }]} pointerEvents="auto">
          <Search size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Versions"
            value={discoverSearch}
            onChangeText={setDiscoverSearch}
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity onPress={() => router.push('/version-manager/language')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14 }} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Globe size={18} color="#1a1a1a" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a' }}>{selectedLanguage.name}</Text>
            {(bibles.length > 0 || selectedLanguage.biblesCount) && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#666' }}>
                  {bibles.length > 0 ? bibles.length : (selectedLanguage.publishedVersionCount ?? selectedLanguage.biblesCount)}
                </Text>
              </View>
            )}
            <ChevronRight size={16} color="#999" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingTop: 200 }}>

      {biblesLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6596" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.discoverListContainer}>
            {displayBibles.length === 0 ? (
              <Text style={styles.emptyText}>No versions found.</Text>
            ) : (
              displayBibles.map(bible => {
                const abbr = String(bible.abbreviation || bible.localized_abbreviation || bible.id || '').replace(/(\d{2,})$/, '\n$1');
                
                const isDownloaded = downloadedIds.includes(String(bible.id));
                let hasUpdate = false;
                if (isDownloaded) {
                  const localBible = savedVersions.find((v: any) => String(v.id) === String(bible.id));
                  const localVersion = Number(localBible?._localContentVersion ?? 1);
                  const remoteVersion = Number(bible.contentVersion ?? 1);
                  if (remoteVersion > localVersion) {
                    hasUpdate = true;
                  }
                }

                return (
                  <TouchableOpacity
                    key={bible.id}
                    style={styles.discoverListItem}
                    onPress={() => {
                      router.push({ pathname: '/version-manager/detail', params: { bibleStr: JSON.stringify(bible) } });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.discoverAbbrBox}>
                      <Text style={styles.discoverAbbrText}>{abbr}</Text>
                    </View>
  
                    <View style={styles.versionInfo}>
                      <Text style={styles.publisherText}>
                        {bible.publisher?.name || publishers[bible.organization_id] || (bible.organization_id ? 'Loading...' : 'Public Domain')}
                      </Text>
                      <Text style={styles.versionName}>
                        {bible.title || bible.localized_title}
                      </Text>
                    </View>
                    
                    <View style={{ marginLeft: 12 }}>
                      {hasUpdate ? (
                        <CloudDownload size={20} color="#D97706" />
                      ) : isDownloaded ? (
                        <CustomCloud size={22} color="#ccc" />
                      ) : (
                        <ChevronRight size={20} color="#ccc" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
      </View>
    </View>
  );
}
