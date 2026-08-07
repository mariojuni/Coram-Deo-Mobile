import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings2 } from 'lucide-react-native';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';

// ── System design tokens ──────────────────────────────────────────────────────
const BRAND        = '#FF6596';
const BRAND_BORDER = 'rgba(255,101,150,0.18)';
const BRAND_PURPLE = '#B66DFF';
const TEXT_PRIMARY = '#0F172A';
const TEXT_MUTED   = '#94A3B8';
const BG_ELEMENT   = '#F9FAFB';
const GREEN_ACTIVE = '#10B981';

const AVATAR_SIZE = 62;

interface ProfileHeaderCardProps {
  fullName: string;
  photoUrl?: string | null;
  churchName?: string;
  roleChips: string[];
  status?: string;
  stats: {
    highlightsCount: number;
    notesCount: number;
    plansCount: number;
    groupsCount: number;
    ministriesCount: number;
  };
  onEditAvatar: () => void;
  onSettingsPress?: () => void;
  onStatPress?: (statKey: 'highlights' | 'notes' | 'plans' | 'groups' | 'ministries') => void;
}

export function ProfileHeaderCard({
  fullName,
  photoUrl,
  churchName,
  roleChips,
  status = 'Active',
  stats,
  onEditAvatar,
  onSettingsPress,
  onStatPress,
}: ProfileHeaderCardProps) {
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'M';

  const isVerified = status === 'active' || status === 'Active';
  const showChurch = !!churchName && churchName !== 'Church App Community';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>

        {/* Avatar — display only, no tap */}
        <View style={styles.avatarContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[BRAND, BRAND_PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarInitials}
            >
              <Text style={styles.avatarInitialsText}>{initials}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Name + meta */}
        <View style={styles.infoStack}>
          <Text style={styles.nameText} numberOfLines={1}>{fullName}</Text>

          {showChurch && (
            <Text style={styles.churchText} numberOfLines={1}>{churchName}</Text>
          )}

          {isVerified && (
            <View style={styles.activeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active Member</Text>
            </View>
          )}
        </View>

        {/* Settings button */}
        {onSettingsPress && (
          <TouchableOpacity style={styles.settingsBtn} onPress={onSettingsPress} activeOpacity={0.75}>
            <Settings2 size={17} color="#64748B" strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...(getSoftShadowStyle(20) as any),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  // ── Avatar ──────────────────────────────────────────────────
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarInitials: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Info stack ──────────────────────────────────────────────
  infoStack: {
    flex: 1,
    gap: 4,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  churchText: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_MUTED,
    flexShrink: 1,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN_ACTIVE,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: GREEN_ACTIVE,
  },

  // ── Settings button ─────────────────────────────────────────
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: BG_ELEMENT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
