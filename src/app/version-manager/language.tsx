
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { BounceCard } from '@/components/ui/BounceCard';
import { styles } from '@/features/bible/presentation/version-manager/styles';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';

export default function LanguageSelectScreen() {
  const router = useRouter();
  const { POPULAR_LANGUAGES, selectedLanguage, setSelectedLanguage } = useVersionContext();
  const [search, setSearch] = useState('');

  const filteredLanguages = POPULAR_LANGUAGES.filter((l: any) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return l.name.toLowerCase().includes(lower) || (l.local_name && l.local_name.toLowerCase().includes(lower));
  });

  const handleSelectLanguage = (lang: any) => {
    setSelectedLanguage(lang);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
          <Text style={[styles.modalTitle, { fontSize: 16, marginHorizontal: 12, flex: 1, textAlign: 'center' }]}>Language</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={{ marginTop: 95, paddingHorizontal: 16 }}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
        </View>
      </View>
      <ScrollView style={styles.content}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {filteredLanguages.map((lang: any) => {
            const isSelected = selectedLanguage.id === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#f8f9fa', borderRadius: 16, marginBottom: 8 }, isSelected && { backgroundColor: 'rgba(255,101,150,0.05)' }]}
                onPress={() => handleSelectLanguage(lang)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={[{ fontSize: 16, fontWeight: '600', color: '#1a1a1a' }, isSelected && styles.textActive]}>{lang.name}</Text>
                  {lang.local_name && lang.local_name !== lang.name && (
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{lang.local_name}</Text>
                  )}
                </View>
                {isSelected ? (
                  <Check size={20} color="#FF6596" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, color: '#999' }}>{lang.biblesCount || '?'} versions</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  );
}
