
import { useVersionContext } from '@/features/bible/presentation/context/VersionManagerContext';
import { BounceCard } from '@/components/ui/BounceCard';
import { styles } from '@/features/bible/presentation/version-manager/styles';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Search } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.modalHeader}>
        <View style={styles.headerLeftContainer}>
          <BounceCard bounceScale={0.85} onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </BounceCard>
        </View>
        <Text style={styles.modalTitle}>Languages</Text>
        <View style={styles.headerRightContainer} />
      </View>

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
    </SafeAreaView>
  );
}
