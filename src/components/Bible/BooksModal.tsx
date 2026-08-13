import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check, ChevronLeft } from 'lucide-react-native';
import { BounceCard } from '@/components/ui/BounceCard';
import AppModal, { ModalDragArea } from '../ui/AppModal';
import { useBooksModal } from '@/features/bible/presentation/hooks/useBooksModal';
import { bibleDataService } from '@/features/bible/data/BibleDataService';
import { getUserPreferences } from '@/features/bible/data/bible.repository';
import { getHumanReadableBookName } from '@/utils/scriptureReferenceParser';
import type { BibleNoteScripture } from '@/features/bibleNotes/domain/bibleNote.types';

interface BooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: any[];
  onSelectChapter: (bookId: string, chapterNum: string) => void;
  activeBookId?: string;
  onSelectVerses?: (scripture: BibleNoteScripture) => void;
}

export default function BooksModal({ isOpen, onClose, books, onSelectChapter, activeBookId, onSelectVerses }: BooksModalProps) {
  const { collapseBook, expandedBook, sortedBooks, toggleBook, setExpandedBook } = useBooksModal(books);
  const scrollViewRef = useRef<ScrollView>(null);
  const itemLayouts = useRef<Record<string, number>>({});
  const [scrollViewHeight, setScrollViewHeight] = useState<number>(0);

  // New state for verse selection
  const [viewMode, setViewMode] = useState<'books' | 'verses'>('books');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [chapterData, setChapterData] = useState<any[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [versionId, setVersionId] = useState<string>('1');

  // Reset view state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('books');
      setSelectedBookId(null);
      setSelectedChapter(null);
      setSelectedVerses(new Set());
      setChapterData([]);
    }
  }, [isOpen]);

  // When modal opens or activeBookId/sortMode changes, scroll to position active book above center without animation
  useEffect(() => {
    if (!isOpen || viewMode !== 'books') return;

    collapseBook();

    const scrollToActiveBook = () => {
      if (!activeBookId || !scrollViewRef.current) return;
      const key = String(activeBookId);
      const y = itemLayouts.current[key];
      if (y !== undefined) {
        const targetOffset = Math.max(0, y - (scrollViewHeight > 0 ? scrollViewHeight * 0.3 : 150));
        scrollViewRef.current.scrollTo({ y: targetOffset, animated: false });
      }
    };

    scrollToActiveBook();
    const timer = setTimeout(scrollToActiveBook, 50);

    return () => clearTimeout(timer);
  }, [isOpen, activeBookId, scrollViewHeight, viewMode]);

  // Verse fetching effect
  useEffect(() => {
    if (viewMode === 'verses' && selectedBookId && selectedChapter) {
      let isMounted = true;
      const fetchChapter = async () => {
        setLoadingVerses(true);
        try {
          const prefs = await getUserPreferences();
          const activeTranslation = String(prefs?.activeTranslation || '1');
          setVersionId(activeTranslation);

          const data = await bibleDataService.getChapter(activeTranslation, selectedBookId, parseInt(selectedChapter, 10));
          if (isMounted) {
            setChapterData(data.verses || []);
          }
        } catch (e) {
          console.warn('Failed to fetch chapter in BooksModal', e);
        } finally {
          if (isMounted) setLoadingVerses(false);
        }
      };
      fetchChapter();
      return () => { isMounted = false; };
    }
  }, [viewMode, selectedBookId, selectedChapter]);

  const handleItemLayout = (bookId: string | number, event: LayoutChangeEvent) => {
    itemLayouts.current[String(bookId)] = event.nativeEvent.layout.y;
  };

  const handleChapterPress = (book: any, chapterNum: string) => {
    if (onSelectVerses) {
      // Go to verse selection
      setSelectedBookId(String(book.id));
      setSelectedChapter(chapterNum);
      setSelectedVerses(new Set());
      setViewMode('verses');
    } else {
      // Quick jump
      onSelectChapter(book.id, chapterNum);
      collapseBook();
    }
  };

  const renderChapters = (book: any) => {
    const chapters = book.chapters || (book.chapterCount ? Array.from({ length: book.chapterCount }, (_, i) => ({ id: String(i + 1), human_reference: String(i + 1) })) : []);
    
    return (
      <View style={styles.chapterGridContainer}>
        {chapters.map((chapter: any) => {
          const chapNum = chapter.human_reference || String(chapter.id);
          return (
            <TouchableOpacity 
              key={chapter.id}
              style={styles.chapterGridItem}
              onPress={() => handleChapterPress(book, String(chapter.id))}
            >
              <Text style={styles.chapterGridText}>{chapNum}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // === VERSE SELECTION LOGIC ===
  const toggleVerse = (verseNum: number) => {
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
  };

  const sortedSelected = useMemo(() => Array.from(selectedVerses).sort((a, b) => a - b), [selectedVerses]);

  const previewLines = useMemo(() => {
    return sortedSelected.map(vNum => {
      const vData = chapterData.find(v => parseInt(v.verseNumber, 10) === vNum);
      if (!vData) return null;
      
      const clean = (vData.content || '').replace(/\{\{note:\d+\}\}/g, '').replace(/<[^>]*>/g, '').replace(/#/g, '').trim();
      const SUPERSCRIPT_MAP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
      const sup = String(vNum).split('').map(d => SUPERSCRIPT_MAP[d] ?? d).join('');
      return `${sup} ${clean}`;
    }).filter(Boolean) as string[];
  }, [sortedSelected, chapterData]);

  const handleConfirmVerses = () => {
    if (sortedSelected.length === 0 || !selectedBookId || !selectedChapter || !onSelectVerses) return;

    const activeBookObj = books.find(b => String(b.id) === selectedBookId);
    const bookTitle = selectedBookId ? getHumanReadableBookName(selectedBookId) : (activeBookObj?.title || selectedBookId);

    let rangeStr = '';
    if (sortedSelected.length === 1) {
      rangeStr = `${sortedSelected[0]}`;
    } else {
      let isConsecutive = true;
      for (let i = 1; i < sortedSelected.length; i++) {
        if (sortedSelected[i] !== sortedSelected[i - 1] + 1) { isConsecutive = false; break; }
      }
      rangeStr = isConsecutive ? `${sortedSelected[0]}–${sortedSelected[sortedSelected.length - 1]}` : sortedSelected.join(', ');
    }

    const cleanLines = sortedSelected.map(vNum => {
      const vData = chapterData.find(v => parseInt(v.verseNumber, 10) === vNum);
      if (!vData) return '';
      const clean = (vData.content || '').replace(/\{\{note:\d+\}\}/g, '').replace(/<[^>]*>/g, '').replace(/#/g, '').trim();
      return `${vNum} ${clean}`;
    }).filter(s => s.trim().length > 0);

    const scripture: BibleNoteScripture = {
      versionId,
      bookId: selectedBookId,
      bookName: bookTitle,
      chapter: parseInt(selectedChapter, 10),
      verseStart: sortedSelected[0],
      verseEnd: sortedSelected[sortedSelected.length - 1],
      verseIds: sortedSelected.map(String),
      reference: `${bookTitle} ${selectedChapter}:${rangeStr}`,
      textSnapshot: cleanLines.join('\n'),
    };

    onSelectVerses(scripture);
  };

  const renderVersesView = () => {
    const activeBookObj = books.find(b => String(b.id) === selectedBookId);
    const bookTitle = selectedBookId ? getHumanReadableBookName(selectedBookId) : (activeBookObj?.title || selectedBookId);

    return (
      <View style={styles.versesViewContainer}>
        <View style={styles.referenceBar}>
          <Text style={styles.referenceText}>{bookTitle} {selectedChapter}</Text>
        </View>

        {loadingVerses ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#FF6596" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.verseGridContainer}>
              {chapterData.map((verse) => {
                const vNum = parseInt(verse.verseNumber, 10);
                if (isNaN(vNum)) return null;
                const isSelected = selectedVerses.has(vNum);
                return (
                  <TouchableOpacity
                    key={verse.id || verse.verseNumber}
                    style={[styles.verseGridItem, isSelected && styles.verseGridItemActive]}
                    onPress={() => toggleVerse(vNum)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.verseGridText, isSelected && styles.verseGridTextActive]}>
                      {vNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {previewLines.length > 0 && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewContent}>{previewLines.join('\n\n')}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <AppModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={viewMode === 'books' ? "Books" : "Select Verse"}
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
      heightRatio={0.85}
    >
      <View style={styles.modalContainer}>
        <ModalDragArea style={[styles.headerContainer, { paddingTop: 12 }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
          <View style={styles.dragHandle} />
          
          <View style={styles.headerContent}>
            {viewMode === 'books' ? (
              <View style={{ width: 40 }} />
            ) : (
              <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={() => setViewMode('books')} hitSlop={8}>
                <ChevronLeft size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            )}
            
            <Text style={styles.headerTitle}>{viewMode === 'books' ? 'Books' : 'Select Verse'}</Text>
            
            {viewMode === 'books' ? (
              <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
                <X size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            ) : (
              <BounceCard 
                bounceScale={0.85} 
                style={[styles.headerCircle, sortedSelected.length === 0 && { opacity: 0.5 }]} 
                onPress={handleConfirmVerses} 
                hitSlop={8}
                disabled={sortedSelected.length === 0}
              >
                <Check size={24} color="#111827" strokeWidth={2} />
              </BounceCard>
            )}
          </View>
        </ModalDragArea>

        {viewMode === 'books' ? (
          <>
            <ScrollView 
              ref={scrollViewRef}
              style={styles.content} 
              contentContainerStyle={{ paddingTop: 70 }}
              onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
            >
              {sortedBooks.map((book) => {
                const isExpanded = expandedBook === String(book.id);
                return (
                  <View key={book.id} onLayout={(e) => handleItemLayout(book.id, e)}>
                    <TouchableOpacity
                      style={[styles.bookItem, isExpanded && styles.bookItemExpanded]}
                      onPress={() => toggleBook(book.id)}
                    >
                      <Text style={[styles.bookName, isExpanded && styles.bookNameExpanded, String(book.id) === String(activeBookId) && styles.bookNameActive]}>
                        {book.title || book.name}
                      </Text>
                    </TouchableOpacity>
                    {isExpanded && renderChapters(book)}
                  </View>
                );
              })}
            </ScrollView>

          </>
        ) : (
          <View style={styles.content}>
            {renderVersesView()}
          </View>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  content: { flex: 1, backgroundColor: '#fff' },
  bookItem: { paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f8f8f8', backgroundColor: '#fff' },
  bookItemExpanded: { backgroundColor: '#fff', borderBottomWidth: 0 },
  bookName: { fontSize: 16, color: '#1a1a1a', fontWeight: '600' },
  bookNameExpanded: { fontWeight: '700' },
  bookNameActive: { color: '#FF6596', fontWeight: '700' },
  chapterGridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f8f8f8', justifyContent: 'flex-start' },
  chapterGridItem: { width: '18%', margin: '1%', height: 60, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  chapterGridText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  
  // Verses styles
  versesViewContainer: { flex: 1, paddingTop: 84 },
  referenceBar: { paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  referenceText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  verseGridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  verseGridItem: { width: '18%', margin: '1%', height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  verseGridItemActive: { backgroundColor: '#FF6596' },
  verseGridText: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  verseGridTextActive: { color: '#FFFFFF' },
  previewContainer: { padding: 24 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 },
  previewContent: { fontSize: 16, lineHeight: 28, color: '#111827', fontFamily: 'Inter' }
});
