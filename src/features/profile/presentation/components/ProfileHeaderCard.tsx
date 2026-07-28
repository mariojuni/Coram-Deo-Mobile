import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  Church,
  CheckCircle2,
  Sparkles,
  Bookmark,
  BookOpen,
  Calendar,
  Users,
  ShieldCheck,
  Edit3,
} from 'lucide-react-native';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';

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
  onEditProfile?: () => void;
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
  onEditProfile,
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

  const filteredRoles = roleChips.filter((role) => role !== 'Super Admin');

  const statItems = [
    { key: 'highlights' as const, label: 'Highlights', value: stats.highlightsCount, icon: Bookmark, color: '#EC4899', bgColor: '#FCE7F3' },
    { key: 'notes' as const, label: 'Notes', value: stats.notesCount, icon: BookOpen, color: '#8B5CF6', bgColor: '#F3E8FF' },
    { key: 'plans' as const, label: 'Plans', value: stats.plansCount, icon: Calendar, color: '#3B82F6', bgColor: '#DBEAFE' },
    { key: 'groups' as const, label: 'Groups', value: stats.groupsCount, icon: Users, color: '#10B981', bgColor: '#D1FAE5' },
    { key: 'ministries' as const, label: 'Ministries', value: stats.ministriesCount, icon: ShieldCheck, color: '#F59E0B', bgColor: '#FEF3C7' },
  ];

  return (
    <SoftCard style={{ marginBottom: 18 }}>
      <View style={styles.cardWrapper}>
        {/* Top Vibrant Accent Line */}
        <LinearGradient
          colors={['#7C3AED', '#4F46E5', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />

        <View style={styles.contentContainer}>
          {/* Top Section: Avatar & Details */}
          <View style={styles.topSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarInitials}
                  >
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
                  </LinearGradient>
                )}
              </View>
              <TouchableOpacity style={styles.cameraBtn} onPress={onEditAvatar} activeOpacity={0.85}>
                <Camera size={10} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
                {(status === 'active' || status === 'Active') && (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 size={10} color="#059669" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>

              {!!churchName && churchName !== 'Church App Community' && (
                <View style={styles.churchBadge}>
                  <Church size={10} color="#7C3AED" />
                  <Text style={styles.churchText} numberOfLines={1}>{churchName}</Text>
                </View>
              )}

              {filteredRoles.length > 0 && (
                <View style={styles.rolesRow}>
                  {filteredRoles.map((role, i) => (
                    <View key={i} style={styles.roleChip}>
                      <Sparkles size={9} color="#4F46E5" style={{ marginRight: 3 }} />
                      <Text style={styles.roleText}>{role}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {onEditProfile && (
              <TouchableOpacity style={styles.editBtn} onPress={onEditProfile} activeOpacity={0.75}>
                <Edit3 size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Integrated 5-Metric Dashboard Row */}
          <View style={styles.statsRow}>
            {statItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <BounceCard
                  key={item.key}
                  style={styles.statCol}
                  onPress={() => onStatPress?.(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                    <IconComponent size={13} color={item.color} />
                  </View>
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{item.label}</Text>
                </BounceCard>
              );
            })}
          </View>
        </View>
      </View>
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  contentContainer: {
    padding: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarInitials: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#0F172A',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  churchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  churchText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B21A8',
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.18)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
});
