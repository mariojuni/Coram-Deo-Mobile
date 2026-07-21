
import { fetchBiblesByLanguage } from '@/features/bible/data/bible.repository';
import { BounceCard } from '@/components/ui/BounceCard';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Cloud, Globe, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { styles } from '@/features/bible/presentation/version-manager/styles';

import { BlurView } from 'expo-blur';

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
        const fetchedBibles = await fetchBiblesByLanguage(selectedLanguage.tag);
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
      </View>

      <View style={{ flex: 1, paddingTop: 95 }}>
        <View style={styles.searchContainer}>
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

      <TouchableOpacity onPress={() => router.push('/version-manager/language')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff' }} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Globe size={18} color="#1a1a1a" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1a1a1a' }}>{selectedLanguage.name}</Text>
          {selectedLanguage.biblesCount && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#666' }}>{selectedLanguage.biblesCount}</Text>
            </View>
          )}
          <ChevronRight size={16} color="#999" />
        </View>
      </TouchableOpacity>

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
                        {publishers[bible.organization_id] || (bible.organization_id ? 'Loading...' : 'Public Domain')}
                      </Text>
                      <Text style={styles.versionName}>
                        {bible.title || bible.localized_title}
                      </Text>
                    </View>
                    
                    <View style={{ marginLeft: 12 }}>
                      {downloadedIds.includes(String(bible.id)) ? (
                        <Cloud size={22} color="#ccc" />
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
