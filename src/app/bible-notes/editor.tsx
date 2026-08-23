import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { router, Stack } from 'expo-router';
import { Plus, Users, Lock, X } from 'lucide-react-native';
import { useBibleNoteStore } from '@/features/bibleNotes/presentation/hooks/useBibleNoteStore';
import { bibleNoteRepository } from '@/features/bibleNotes/data/bibleNote.repository';
import { useAuthStore } from '@/store/useAuthStore';
import BooksModal from '@/components/Bible/BooksModal';
import { BlurView } from 'expo-blur';
import { BounceCard } from '@/components/ui/BounceCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopBarButtonShadowStyle, getSoftShadowStyle } from '@/components/ui/SoftCard';

export default function BibleNoteEditorScreen() {
  const {
    noteContent,
    visibility,
    scriptures,
    noteIdToEdit,
    setNoteContent,
    setVisibility,
    addScripture,
    removeScripture,
    reset
  } = useBibleNoteStore();

  const [saving, setSaving] = useState(false);
  const [booksModalOpen, setBooksModalOpen] = useState(false);
  
  

  const currentUser = useAuthStore((s) => s.currentUser);
  const userProfile = useAuthStore((s) => s.userProfile);
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { getUserPreferences } = await import('@/features/bible/data/bible.repository');
        const { bibleDataService } = await import('@/features/bible/data/BibleDataService');
        const prefs = (await getUserPreferences()) as any;
        const activeTranslation = prefs?.activeTranslation || '2692';
        const b = await bibleDataService.getBooks(String(activeTranslation));
        setBooks(b || []);
      } catch (e) {
        console.warn('Failed to load books for note editor:', e);
      }
    };
    fetchBooks();
  }, []);

  const handleClose = () => {
    reset();
    router.back();
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (scriptures.length === 0 && noteContent.trim().length === 0) return;

    setSaving(true);
    try {
      const churchId = userProfile?.churchId || (userProfile as any)?.church_id || (currentUser as any).churchId || (currentUser as any).claims?.churchId;
      
      if (noteIdToEdit) {
        await bibleNoteRepository.updateNote(noteIdToEdit, {
          content: noteContent.trim(),
          visibility,
          scriptures,
        });
      } else {
        await bibleNoteRepository.createNote({
          userId: currentUser.uid,
          userName: (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : currentUser.displayName) || undefined,
          userPhotoUrl: userProfile?.photoUrl || currentUser.photoURL || undefined,
          churchId,
          content: noteContent.trim(),
          visibility,
          scriptures,
          status: 'active',
        });
      }
      reset();
      router.back();
    } catch (e) {
      console.error('Failed to save note:', e);
    } finally {
      setSaving(false);
    }
  };

  const isChurch = visibility === 'church';
  const saveLabel = noteIdToEdit ? 'Save' : (isChurch ? 'Post' : 'Save');
  const canSave = noteContent.trim().length > 0 || scriptures.length > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      
      {/* System Standard Blur Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
        
        <View style={[styles.headerContent, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
          <BounceCard bounceScale={0.85} style={styles.headerCircleBtn} onPress={handleClose} hitSlop={12}>
            <X size={20} color="#1a1a1a" strokeWidth={2.5} />
          </BounceCard>
          
          <Text style={styles.headerTitle} pointerEvents="none">{noteIdToEdit ? 'Edit Note' : 'Note'}</Text>

          <BounceCard 
            bounceScale={0.95}
            style={[styles.saveBtnPill, (!canSave || saving) && styles.saveBtnDisabled]}
            onPress={handleSave} 
            disabled={saving || !canSave}
            hitSlop={12}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : saveLabel}
            </Text>
          </BounceCard>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={[
            styles.scrollContent, 
            { 
              paddingTop: Math.max(insets.top, 20) + 80,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16)
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Soft Card Text Input Box */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="What would you like to say?"
              placeholderTextColor="#9CA3AF"
              value={noteContent}
              onChangeText={setNoteContent}
              selectionColor="#111827"
            />
          </View>
          
          {/* System Styled Visibility Pill */}
          <View style={{ marginBottom: 32, alignItems: 'flex-start' }}>
            <TouchableOpacity 
              style={styles.visibilityPill}
              onPress={() => setVisibility(isChurch ? 'private' : 'church')}
              activeOpacity={0.8}
            >
              {isChurch ? <Users size={12} color="#111827" /> : <Lock size={12} color="#111827" />}
              <Text style={styles.visibilityPillText}>
                {isChurch ? 'Church Feed' : 'Private'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scripture Attachments with Theme Accent */}
          <View style={styles.attachmentsSection}>
            {scriptures.map((scr, idx) => (
              <View key={`${scr.bookId}-${scr.chapter}-${scr.verseStart}-${idx}`} style={styles.scriptureBlock}>
                <View style={styles.scriptureAccentLine} />
                <View style={styles.scriptureContent}>
                  <Text style={styles.scriptureText}>
                    {scr.textSnapshot.replace(/^[0-9]+ /gm, '')}
                  </Text>
                  <Text style={styles.scriptureReference}>
                    {scr.reference}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeScripture(idx)} hitSlop={12} style={styles.removeBtn}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* System Styled Add Verse Button */}
          <TouchableOpacity 
            style={styles.addVerseBtn}
            onPress={() => setBooksModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.addVerseIconWrap}>
              <Plus size={14} color="#4B5563" strokeWidth={2.5} />
            </View>
            <Text style={styles.addVerseText}>Attach Scripture</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>

      <BooksModal
        isOpen={booksModalOpen}
        onClose={() => setBooksModalOpen(false)}
        books={books}
        onSelectChapter={() => {}} // Not used in this mode
        onSelectVerses={(scripture) => {
          addScripture(scripture);
          setBooksModalOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerCircleBtn: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    zIndex: 1,
  },
  saveBtnPill: {
    ...getTopBarButtonShadowStyle(20),
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#F3F4F6',
    boxShadow: 'none',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 80 
  },
  inputContainer: {
    ...getSoftShadowStyle(),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#111827',
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' as any,
  },
  visibilityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  attachmentsSection: { 
    marginBottom: 24 
  },
  scriptureBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  scriptureAccentLine: {
    width: 4,
    backgroundColor: '#FF6596', // App Theme color for the accent
    borderRadius: 2,
    alignSelf: 'stretch',
    marginRight: 16,
  },
  scriptureContent: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  scriptureText: { 
    fontSize: 17, 
    color: '#111827', 
    lineHeight: 26,
    marginBottom: 8,
  },
  scriptureReference: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#4B5563' 
  },
  removeBtn: {
    marginTop: 4,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVerseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addVerseIconWrap: {
    ...getTopBarButtonShadowStyle(14),
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVerseText: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#4B5563', 
  }
});
