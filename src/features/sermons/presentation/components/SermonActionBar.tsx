import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Play, Headphones, Download } from 'lucide-react-native';
import type { Sermon } from '../../domain/sermon.types';
import * as Haptics from 'expo-haptics';

interface SermonActionBarProps {
  sermon: Sermon;
  onWatch: () => void;
  onListen: () => void;
  onDownloadAudio: () => void;
  isDownloading?: boolean;
  isDownloaded?: boolean;
}

const NAVY = '#1A1A1A';
const GOLD = '#FF6596';
const OLIVE = '#C084FC';
const BEIGE = '#FAFAFA';

export function SermonActionBar({
  sermon,
  onWatch,
  onListen,
  onDownloadAudio,
  isDownloading = false,
  isDownloaded = false,
}: SermonActionBarProps) {
  const hasAudio = sermon.mediaType === 'audio' || sermon.mediaType === 'both';

  const handleListen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onListen();
  };

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDownloadAudio();
  };

  return (
    <View style={styles.container}>
      <View style={styles.secondaryRow}>
        {hasAudio && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleListen} activeOpacity={0.85}>
            <Headphones size={16} color={OLIVE} />
            <Text style={[styles.secondaryBtnText, { color: OLIVE }]}>Listen</Text>
          </TouchableOpacity>
        )}

        {hasAudio && (
          <TouchableOpacity
            style={[styles.secondaryBtn, isDownloaded && styles.downloadedBtn]}
            onPress={handleDownload}
            activeOpacity={0.85}
            disabled={isDownloading}
          >
            <Download size={16} color={isDownloaded ? '#fff' : NAVY} />
            <Text style={[styles.secondaryBtnText, { color: isDownloaded ? '#fff' : NAVY }]}>
              {isDownloading ? 'Downloading...' : isDownloaded ? 'Downloaded' : 'Download Audio'}
            </Text>
          </TouchableOpacity>
        )}


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingVertical: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BEIGE,
    borderWidth: 1.5,
    borderColor: '#E2D9CD',
    borderRadius: 12,
    paddingVertical: 11,
    gap: 6,
  },
  downloadedBtn: {
    backgroundColor: OLIVE,
    borderColor: OLIVE,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
