import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Church, CheckCircle2, Sparkles } from 'lucide-react-native';
import { SoftCard } from '@/components/ui/SoftCard';

interface ProfileHeaderCardProps {
  fullName: string;
  photoUrl?: string | null;
  churchName?: string;
  roleChips: string[];
  status?: string;
  onEditAvatar: () => void;
}

export function ProfileHeaderCard({
  fullName,
  photoUrl,
  churchName,
  roleChips,
  status = 'Active',
  onEditAvatar,
}: ProfileHeaderCardProps) {
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'M';

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'Pastor':
        return { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
      case 'Super Admin':
      case 'Church Admin':
        return { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' };
      case 'Finance Admin':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
      case 'Ministry Leader':
      case 'Group Leader':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'Secretary':
        return { bg: '#E0F2FE', text: '#075985', border: '#BAE6FD' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  return (
    <SoftCard style={{ marginBottom: 20 }}>
      <LinearGradient colors={['#FFFFFF', '#FAF5FF', '#F9FAFB']} style={styles.cardContent}>
        <View style={styles.avatarGlowRing}>
          <View style={styles.avatarContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#7C3AED', '#EC4899']} style={styles.avatarInitials}>
                <Text style={styles.avatarInitialsText}>{initials}</Text>
              </LinearGradient>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={onEditAvatar} activeOpacity={0.85}>
              <Camera size={13} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>{fullName}</Text>

        {!!churchName && (
          <View style={styles.churchBadge}>
            <Church size={13} color="#7C3AED" />
            <Text style={styles.churchText} numberOfLines={1}>{churchName}</Text>
          </View>
        )}

        <View style={styles.chipsContainer}>
          {roleChips.map((role, idx) => {
            const style = getRoleStyle(role);
            return (
              <View
                key={`${role}-${idx}`}
                style={[
                  styles.roleChip,
                  { backgroundColor: style.bg, borderColor: style.border },
                ]}
              >
                <Sparkles size={11} color={style.text} style={{ marginRight: 4 }} />
                <Text style={[styles.roleChipText, { color: style.text }]}>{role}</Text>
              </View>
            );
          })}

          {status === 'active' || status === 'Active' ? (
            <View style={[styles.roleChip, styles.activeChip]}>
              <CheckCircle2 size={11} color="#047857" style={{ marginRight: 4 }} />
              <Text style={styles.activeChipText}>Verified Member</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 22,
    alignItems: 'center',
  },
  avatarGlowRing: {
    padding: 3,
    borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 46 },
  avatarInitials: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: { color: '#FFF', fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#111827',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4, letterSpacing: -0.4 },
  churchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 12,
  },
  churchText: { fontSize: 12, fontWeight: '700', color: '#6B21A8' },
  chipsContainer: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  roleChipText: { fontSize: 12, fontWeight: '700' },
  activeChip: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' },
  activeChipText: { fontSize: 12, fontWeight: '700', color: '#047857' },
});
