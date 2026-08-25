import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image as RNImage } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { getHumanReadableBookName } from '@/utils/scriptureReferenceParser';
import { Image } from 'expo-image';
import type { FeedNoteItem } from '@/store/useFeedStore';
import type { DashboardNoteItem, UserHighlightItem } from '@/features/profile/presentation/hooks/useProfileDashboardData';
import type { BibleHighlight } from '@/features/bibleHighlights/domain/bibleHighlight.types';
import type { Prayer } from '@/features/prayer/domain/prayer.types';

type ShareItem = FeedNoteItem | DashboardNoteItem | BibleHighlight | UserHighlightItem | Prayer;

export interface ShareImageGeneratorRef {
  captureAndShare: (item: ShareItem, type?: 'note' | 'highlight' | 'prayer') => Promise<void>;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const ShareImageGenerator = forwardRef<ShareImageGeneratorRef>((props, ref) => {
  const [currentItem, setCurrentItem] = useState<{ item: ShareItem; type: 'note' | 'highlight' | 'prayer' } | null>(null);
  const viewShotRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    captureAndShare: async (item: ShareItem, type: 'note' | 'highlight' | 'prayer' = 'note') => {
      setCurrentItem({ item, type });
      
      // Wait for React to render the new state
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      try {
        if (viewShotRef.current && viewShotRef.current.capture) {
          const uri = await viewShotRef.current.capture();
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              dialogTitle: type === 'prayer' ? 'Share Prayer' : type === 'highlight' ? 'Share Highlight' : 'Share Note',
              mimeType: 'image/jpeg',
            });
          }
        }
      } catch (error) {
        console.error('Failed to capture and share item:', error);
      } finally {
        // Clear item to avoid rendering it unnecessarily
        setCurrentItem(null);
      }
    }
  }));

  if (!currentItem) {
    return null;
  }

  const { item, type } = currentItem;

  let firstReference = '';
  let textSnapshot = '';
  let noteContent = '';

  let prayerTitle = '';
  let prayerText = '';
  let isAnswered = false;

  if (type === 'note') {
    const note = item as (FeedNoteItem | DashboardNoteItem);
    const isSermon = note._type === 'sermon';
    
    if (!isSermon && note.scriptures && note.scriptures.length > 0) {
      const s0 = note.scriptures[0];
      const fullBookName = getHumanReadableBookName(s0.bookId);
      const verseStr = s0.verseStart === s0.verseEnd ? s0.verseStart : `${s0.verseStart}-${s0.verseEnd}`;
      firstReference = `${fullBookName} ${s0.chapter}:${verseStr}`;
      textSnapshot = s0.textSnapshot || '';
    } else if (isSermon) {
      firstReference = 'Sermon Note';
    }
    noteContent = note.content || '';
  } else if (type === 'highlight') {
    const highlight = item as (BibleHighlight | UserHighlightItem);
    const fullBookName = getHumanReadableBookName(highlight.bookName);
    const verseRefLabel = highlight.verseRangeLabel || `${highlight.verseNumber}`;
    firstReference = `${fullBookName} ${highlight.chapter}:${verseRefLabel}`;
    textSnapshot = highlight.text || '';
    // A highlight doesn't have custom note content
    noteContent = '';
  } else if (type === 'prayer') {
    const prayer = item as Prayer | any;
    prayerTitle = prayer.title || '';
    prayerText = prayer.request || prayer.requestText || prayer.content || '';
    isAnswered = !!(prayer.answered || prayer.status === 'answered');
  }

  // The hidden container positioned way off-screen
  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
        <View style={styles.snapshotWrapper}>
          <View style={styles.card}>
            {/* Header with App Logo */}
            <View style={styles.header}>
              <Image 
                source={require('@/assets/images/logo.png')} 
                style={styles.logo} 
                contentFit="contain" 
              />
              <Text style={styles.appName}>Coram Deo</Text>
            </View>

            {/* Scripture Blockquote */}
            {textSnapshot ? (
              <View style={styles.scriptureBlock}>
                <Text style={styles.scriptureText}>
                  "{textSnapshot.replace(/{{note:[0-9]+}}/g, '').trim()}"
                </Text>
                <Text style={styles.scriptureReference}>
                  {firstReference}
                </Text>
              </View>
            ) : null}

            {/* Note Content */}
            {!!noteContent && (
              <View style={styles.noteContentBlock}>
                <Text style={styles.noteContentText}>
                  {noteContent}
                </Text>
              </View>
            )}

            {/* Prayer Content */}
            {type === 'prayer' && (
              <View>
                {isAnswered && (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#ECFDF3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>
                      Answered
                    </Text>
                  </View>
                )}

                {!!prayerTitle && (
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 8, lineHeight: 24 }}>
                    {prayerTitle}
                  </Text>
                )}

                <View style={styles.noteContentBlock}>
                  <Text style={styles.noteContentText}>
                    {prayerText}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ViewShot>
    </View>
  );
});

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: -10000,
    left: -10000,
    opacity: 0,
    width: SCREEN_WIDTH * 0.9,
  },
  snapshotWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  scriptureBlock: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6596',
    paddingLeft: 16,
    marginBottom: 20,
  },
  scriptureText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  scriptureReference: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  noteContentBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noteContentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
});
