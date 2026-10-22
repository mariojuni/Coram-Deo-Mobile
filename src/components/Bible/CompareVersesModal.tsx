import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Download, X } from 'lucide-react-native';
import AppModal, { ModalDragArea } from '@/components/ui/AppModal';
import { BounceCard } from '@/components/ui/BounceCard';
import { getTopBarButtonShadowStyle } from '@/components/ui/SoftCard';
import { bibleDataService } from '@/features/bible/data/BibleDataService';
import type { VerseComparisonEntry } from '@/features/bible/domain/BibleRepository';
import { useBibleVersionStore } from '@/store/useBibleVersionStore';

export interface CompareTarget {
  bookId: string;
  bookName: string;
  chapter: number;
  verseNumbers: string[];
  verseRangeLabel: string;
  reference: string;
}

export interface CompareTheme {
  bg: string;
  cardBg: string;
  headerBorder: string;
  headerOverlay: string;
  blurTint: 'light' | 'dark';
  dragHandle: string;
  title: string;
  subtitle: string;
  closeBtnBg: string;
  closeBtnBorder: string;
  closeIcon: string;
  versionAbbr: string;
  versionTitle: string;
  verseNumber: string;
  verseText: string;
  divider: string;
  copyIcon: string;
  noticeCardBg: string;
  noticeCardBorder: string;
  noticeTitle: string;
  noticeText: string;
  emptyTitle: string;
  emptySubtitle: string;
}

export const COMPARE_THEMES: { light: CompareTheme; dark: CompareTheme } = {
  light: {
    bg: '#FAFAFA',
    cardBg: '#FAFAFA',
    headerBorder: 'rgba(0, 0, 0, 0.06)',
    headerOverlay: 'rgba(255, 255, 255, 0.75)',
    blurTint: 'light',
    dragHandle: '#D1D5DB',
    title: '#111827',
    subtitle: '#4B5563',
    closeBtnBg: '#FFFFFF',
    closeBtnBorder: 'rgba(0, 0, 0, 0.06)',
    closeIcon: '#111827',
    versionAbbr: '#111827',
    versionTitle: '#6B7280',
    verseNumber: '#6B7280',
    verseText: '#1F2937',
    divider: '#E5E7EB',
    copyIcon: '#9CA3AF',
    noticeCardBg: '#FFFFFF',
    noticeCardBorder: '#E5E7EB',
    noticeTitle: '#111827',
    noticeText: '#6B7280',
    emptyTitle: '#111827',
    emptySubtitle: '#6B7280',
  },
  dark: {
    bg: '#121214',
    cardBg: '#121214',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    headerOverlay: 'rgba(18, 18, 20, 0.85)',
    blurTint: 'dark',
    dragHandle: '#4B5563',
    title: '#F9FAFB',
    subtitle: '#9CA3AF',
    closeBtnBg: 'rgba(255, 255, 255, 0.08)',
    closeBtnBorder: 'transparent',
    closeIcon: '#D1D5DB',
    versionAbbr: '#FFFFFF',
    versionTitle: '#9CA3AF',
    verseNumber: '#9CA3AF',
    verseText: '#F3F4F6',
    divider: '#27272A',
    copyIcon: '#9CA3AF',
    noticeCardBg: '#1E1E22',
    noticeCardBorder: '#2A2A30',
    noticeTitle: '#F3F4F6',
    noticeText: '#9CA3AF',
    emptyTitle: '#F9FAFB',
    emptySubtitle: '#9CA3AF',
  },
};

interface CompareVersesModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: CompareTarget | null;
  activeTranslation?: string | number;
  onSelectTranslation?: (translationId: string | number) => void;
  /** Reserved for future dark mode feature toggle. Defaults to false (light mode). */
  darkMode?: boolean;
}

export default function CompareVersesModal({
  isOpen,
  onClose,
  target,
  activeTranslation,
  onSelectTranslation,
  darkMode = false,
}: CompareVersesModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<VerseComparisonEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const theme = darkMode ? COMPARE_THEMES.dark : COMPARE_THEMES.light;

  useEffect(() => {
    if (!isOpen || !target) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    bibleDataService
      .getCompareVerses(target.bookId, target.chapter, target.verseNumbers, activeTranslation)
      .then((data) => {
        if (isMounted) {
          setComparisons(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[CompareVersesModal] Error fetching comparisons:', err);
        if (isMounted) {
          setComparisons([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, target, activeTranslation]);

  const handleCopyEntry = async (entry: VerseComparisonEntry) => {
    if (!target) return;
    const textToCopy = `"${entry.formattedText}"\n— ${target.reference} (${entry.abbreviation})`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedId(entry.versionId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === entry.versionId ? null : prev));
    }, 2000);
  };

  const handleSwitchVersion = (entry: VerseComparisonEntry) => {
    if (onSelectTranslation) {
      onSelectTranslation(entry.versionId);
    } else {
      useBibleVersionStore.getState().setTranslation(entry.versionId);
    }
    onClose();
  };

  const isVisible = isOpen && target !== null;

  return (
    <AppModal
      isOpen={isVisible}
      onClose={onClose}
      title="Compare Versions"
      hideHeader={true}
      hideDragHandle={true}
      containerStyle={[styles.modalContainer, { backgroundColor: theme.bg }]}
      heightRatio={0.8}
    >
      <View style={[styles.contentContainer, { backgroundColor: theme.bg }]}>
        {/* Header Bar */}
        <ModalDragArea style={[styles.headerArea, { paddingTop: 10, borderBottomColor: theme.headerBorder }]}>
          <BlurView intensity={theme.blurTint === 'light' ? 80 : 70} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
          <View style={[styles.headerBackgroundOverlay, { backgroundColor: theme.headerOverlay }]} pointerEvents="none" />

          {/* Drag Handle */}
          <View style={[styles.dragHandle, { backgroundColor: theme.dragHandle }]} />

          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.title }]} numberOfLines={1}>
                Compare Versions
              </Text>
              {target?.reference ? (
                <Text style={[styles.headerSubtitle, { color: theme.subtitle }]} numberOfLines={1}>
                  {target.reference}
                </Text>
              ) : null}
            </View>
            <BounceCard
              bounceScale={0.85}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.closeBtnBg, borderColor: theme.closeBtnBorder },
                !darkMode && styles.closeBtnShadow,
              ]}
              onPress={onClose}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <X size={20} color={theme.closeIcon} strokeWidth={2} />
            </BounceCard>
          </View>
        </ModalDragArea>

        {/* Content Body */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6596" />
            <Text style={[styles.loadingText, { color: theme.versionTitle }]}>Loading translations...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 16 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {comparisons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: theme.emptyTitle }]}>No offline versions found</Text>
                <Text style={[styles.emptySubtitle, { color: theme.emptySubtitle }]}>
                  Please download Bible translations from Version Manager to compare verses offline.
                </Text>
                <TouchableOpacity
                  style={styles.discoverBtn}
                  onPress={() => {
                    onClose();
                    router.push('/version-manager/discover');
                  }}
                  activeOpacity={0.8}
                >
                  <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.discoverBtnText}>Download Versions</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {comparisons.map((entry, index) => {
                  const isCurrent = String(entry.versionId) === String(activeTranslation);
                  const isCopied = copiedId === entry.versionId;

                  return (
                    <View key={entry.versionId} style={styles.verseCard}>
                      {/* Version Header */}
                      <View style={styles.versionHeaderRow}>
                        <TouchableOpacity
                          style={styles.versionTitleGroup}
                          onPress={() => handleSwitchVersion(entry)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.abbrBadgeRow}>
                            <Text style={[styles.versionAbbrText, { color: theme.versionAbbr }]}>{entry.abbreviation}</Text>
                            {isCurrent && (
                              <View style={styles.activePill}>
                                <Text style={styles.activePillText}>CURRENT</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>

                        <View style={styles.headerRightActions}>
                          <Text style={[styles.versionFullTitle, { color: theme.versionTitle }]} numberOfLines={1}>
                            {entry.title}
                          </Text>
                          <TouchableOpacity
                            style={styles.copyIconBtn}
                            onPress={() => handleCopyEntry(entry)}
                            hitSlop={8}
                            activeOpacity={0.7}
                          >
                            {isCopied ? (
                              <Check size={16} color="#10B981" />
                            ) : (
                              <Copy size={16} color={theme.copyIcon} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Verse Text Lines */}
                      <View style={styles.versesContainer}>
                        {entry.verses.map((v) => (
                          <Text key={v.verseNumber} style={styles.verseParagraph}>
                            <Text style={[styles.verseNumberSuperscript, { color: theme.verseNumber }]}>{v.verseNumber} </Text>
                            <Text style={[styles.verseBodyText, { color: theme.verseText }]}>{v.text}</Text>
                          </Text>
                        ))}
                      </View>

                      {/* Divider */}
                      {index < comparisons.length - 1 && (
                        <View style={[styles.cardDivider, { backgroundColor: theme.divider }]} />
                      )}
                    </View>
                  );
                })}

                {/* If user only has 1 translation downloaded, show helpful prompt */}
                {comparisons.length === 1 && (
                  <View
                    style={[
                      styles.singleVersionNoticeCard,
                      {
                        backgroundColor: theme.noticeCardBg,
                        borderColor: theme.noticeCardBorder,
                      },
                      !darkMode && styles.noticeCardShadow,
                    ]}
                  >
                    <Text style={[styles.singleVersionNoticeTitle, { color: theme.noticeTitle }]}>
                      Want more comparisons?
                    </Text>
                    <Text style={[styles.singleVersionNoticeText, { color: theme.noticeText }]}>
                      Download additional translations in Version Manager to compare verses side-by-side.
                    </Text>
                    <TouchableOpacity
                      style={styles.singleVersionNoticeBtn}
                      onPress={() => {
                        onClose();
                        router.push('/version-manager/discover');
                      }}
                      activeOpacity={0.8}
                    >
                      <Download size={16} color="#FF6596" style={{ marginRight: 6 }} />
                      <Text style={styles.singleVersionNoticeBtnText}>Get More Versions</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
  headerArea: {
    zIndex: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 36,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: -0.1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnShadow: {
    ...getTopBarButtonShadowStyle(18),
  },
  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  verseCard: {
    marginBottom: 16,
  },
  versionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  versionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  abbrBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  versionAbbrText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activePill: {
    backgroundColor: 'rgba(255, 101, 150, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    marginLeft: 12,
  },
  versionFullTitle: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  copyIconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  versesContainer: {
    marginTop: 2,
  },
  verseParagraph: {
    marginBottom: 6,
    lineHeight: 25,
  },
  verseNumberSuperscript: {
    fontSize: 12,
    fontWeight: '700',
  },
  verseBodyText: {
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: -0.1,
    fontFamily: 'Inter',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6596',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  discoverBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  singleVersionNoticeCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  noticeCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  singleVersionNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  singleVersionNoticeText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  singleVersionNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 101, 150, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  singleVersionNoticeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6596',
  },
});
