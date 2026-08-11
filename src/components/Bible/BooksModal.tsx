import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { BounceCard } from '@/components/ui/BounceCard';
import AppModal from '../ui/AppModal';
import { useBooksModal } from '@/features/bible/presentation/hooks/useBooksModal';

interface BooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: any[];
  onSelectChapter: (bookId: string, chapterNum: string) => void;
  activeBookId?: string;
}

export default function BooksModal({ isOpen, onClose, books, onSelectChapter, activeBookId }: BooksModalProps) {
  const { collapseBook, expandedBook, setSortMode, sortMode, sortedBooks, toggleBook } = useBooksModal(books);

  const renderChapters = (book: any) => {
    // Legacy support: YouVersion uses book.chapters, our new model uses book.chapterCount
    const chapters = book.chapters || (book.chapterCount ? Array.from({ length: book.chapterCount }, (_, i) => ({ id: String(i + 1), human_reference: String(i + 1) })) : []);
    
    return (
      <View style={styles.chapterGridContainer}>
        {chapters.map((chapter: any) => {
          const chapNum = chapter.human_reference || String(chapter.id);
          return (
            <TouchableOpacity 
              key={chapter.id}
              style={styles.chapterGridItem}
              onPress={() => {
                onSelectChapter(book.id, chapter.id);
                collapseBook();
              }}
            >
              <Text style={styles.chapterGridText}>{chapNum}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <AppModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Books"
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}
      heightRatio={0.85}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.headerContainer, { paddingTop: 12 }]} pointerEvents="box-none">
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
          <View style={styles.dragHandle} />
          <View style={styles.headerContent}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Books</Text>
            <BounceCard bounceScale={0.85} style={styles.headerCircle} onPress={onClose} hitSlop={8} activeOpacity={0.8}>
              <X size={24} color="#111827" strokeWidth={2} />
            </BounceCard>
          </View>
        </View>

        {/* Book List */}
        <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 70 }}>
        {sortedBooks.map((book) => {
          const isExpanded = expandedBook === String(book.id);
          return (
            <View key={book.id}>
              <TouchableOpacity
                style={[styles.bookItem, isExpanded && styles.bookItemExpanded]}
                onPress={() => toggleBook(book.id)}
              >
                <Text style={[styles.bookName, isExpanded && styles.bookNameExpanded, book.id === activeBookId && styles.bookNameActive]}>
                  {book.title || book.name}
                </Text>
              </TouchableOpacity>
              {isExpanded && renderChapters(book)}
            </View>
          );
        })}
      </ScrollView>

      {/* Segmented Control */}
      <View style={styles.bottomBar}>
        <View style={styles.segmentContainer}>
          <TouchableOpacity 
            style={[styles.segmentBtn, sortMode === 'Traditional' && styles.segmentBtnActive]}
            onPress={() => setSortMode('Traditional')}
          >
            <Text style={[styles.segmentText, sortMode === 'Traditional' && styles.segmentTextActive]}>
              Traditional
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, sortMode === 'Alphabetical' && styles.segmentBtnActive]}
            onPress={() => setSortMode('Alphabetical')}
          >
            <Text style={[styles.segmentText, sortMode === 'Alphabetical' && styles.segmentTextActive]}>
              Alphabetical
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { backgroundColor: '#fff' },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerCircle: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  content: { flexShrink: 1, backgroundColor: '#fff' },
  bookItem: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    backgroundColor: '#fff'
  },
  bookItemExpanded: {
    backgroundColor: '#fff', 
    borderBottomWidth: 0,
  },
  bookName: { fontSize: 16, color: '#1a1a1a', fontWeight: '600' },
  bookNameExpanded: { fontWeight: '700' },
  bookNameActive: { color: '#FF6596', fontWeight: '700' },
  chapterGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    justifyContent: 'flex-start',
  },
  chapterGridItem: {
    width: '18%',
    margin: '1%',
    height: 60, // Fixed height avoids the React Native aspectRatio+flexWrap bug
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  chapterGridText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  bottomBar: {
    padding: 24,
    backgroundColor: '#fff',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: 'transparent',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  segmentTextActive: {
    color: '#1a1a1a',
  }
});
