import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Cake, Send, Sparkles, Gift, HeartHandshake } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMemberStore } from '@/store/useMemberStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatMemberName, parseMemberDate, formatBirthday } from '../../domain/member.utils';

export function BirthdaysScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const members = useMemberStore(state => state.members);
    const membersLoading = useMemberStore(state => state.membersLoading);
    const userProfile = useAuthStore(state => state.userProfile);

    const { todayBirthdays, upcomingBirthdays, thisMonthBirthdays } = useMemo(() => {
        const today = new Date();
        const curMonth = today.getMonth() + 1;
        const curDay = today.getDate();

        const canSeeLeadersOnly = userProfile?.role === 'pastor' || userProfile?.role === 'church_admin' || userProfile?.role === 'super_admin';

        const validMembers = members.filter(m => {
            if (m.status === 'inactive') return false;
            
            const visibility = m.birthdayVisibility || 'members_only';
            if (visibility === 'hidden') return false;
            if (visibility === 'leaders_only' && !canSeeLeadersOnly) return false;
            
            return parseMemberDate(m) !== null;
        });

        const parsedMembers = validMembers.map(m => {
            const d = parseMemberDate(m)!;
            return { ...m, parsedMonth: d.m, parsedDay: d.d };
        });

        const todayBirthdays = parsedMembers.filter(m => m.parsedMonth === curMonth && m.parsedDay === curDay);
        
        const thisMonthBirthdays = parsedMembers
            .filter(m => m.parsedMonth === curMonth && m.parsedDay !== curDay)
            .sort((a, b) => a.parsedDay - b.parsedDay);

        const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
        const upcomingBirthdays = parsedMembers
            .filter(m => m.parsedMonth === nextMonth)
            .sort((a, b) => a.parsedDay - b.parsedDay);

        return { todayBirthdays, upcomingBirthdays, thisMonthBirthdays };
    }, [members, userProfile]);

    const sendGreeting = (member: any) => {
        Share.share({
            message: `Happy birthday ${formatMemberName(member)}! May the Lord bless you and strengthen you as you continue to walk with Him.`
        });
    };

    const renderBirthdaySection = (title: string, data: any[], isToday = false) => {
        if (data.length === 0) return null;
        return (
            <View style={styles.birthdaySection}>
                <View style={styles.sectionHeaderRow}>
                    {isToday && <Sparkles size={18} color="#FF6596" />}
                    <Text style={[styles.birthdaySectionTitle, isToday && { color: '#FF6596' }]}>{title}</Text>
                </View>
                {data.map(member => (
                    <View key={member.id} style={styles.card}>
                        <View style={styles.avatarWrap}>
                            <Image
                                source={{ uri: member.photoUrl || member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(member))}&background=f0f0f0&color=999` }}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.details}>
                            <Text style={styles.name}>{formatMemberName(member)}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Cake size={12} color="#79809B" />
                                <Text style={styles.meta}>{formatBirthday(member)}</Text>
                            </View>
                            {member.ministryIds && member.ministryIds.length > 0 && (
                                <LinearGradient
                                    colors={['#F3E8FF', '#E0E7FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.ministryBadge}
                                >
                                    <HeartHandshake size={10} color="#8B5CF6" />
                                    <Text style={styles.ministryBadgeText}>Ministry</Text>
                                </LinearGradient>
                            )}
                        </View>
                        <TouchableOpacity style={styles.greetingBtn} onPress={() => sendGreeting(member)}>
                            <LinearGradient
                                colors={['#FF6596', '#C084FC']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Send size={14} color="#FFF" />
                            <Text style={styles.greetingBtnText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 24) }]} pointerEvents="box-none">
                    <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]} pointerEvents="none" />
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.headerCircle} onPress={() => router.back()} hitSlop={8}>
                            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>Birthdays</Text>
                        <View style={[styles.headerCircle, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]} />
                    </View>
                </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70 }]} showsVerticalScrollIndicator={false}>
                <View style={styles.heroBanner}>
                    <LinearGradient
                        colors={['#FFD1DF', '#E8D4FF', '#D4E4FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.heroOrb1} />
                    <View style={styles.heroOrb2} />
                    <View style={styles.heroContent}>
                        <View style={styles.heroIconWrap}>
                            <Gift size={24} color="#FF6596" />
                        </View>
                        <Text style={styles.heroTitle}>This Month</Text>
                        <Text style={styles.heroSubtitle}>
                            {thisMonthBirthdays.length + todayBirthdays.length} {thisMonthBirthdays.length + todayBirthdays.length === 1 ? 'member is' : 'members are'} celebrating!
                        </Text>
                    </View>
                </View>

                {membersLoading ? (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderSubtitle}>Loading birthdays...</Text>
                    </View>
                ) : todayBirthdays.length === 0 && thisMonthBirthdays.length === 0 && upcomingBirthdays.length === 0 ? (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderTitle}>No birthdays found</Text>
                        <Text style={styles.placeholderSubtitle}>No active members have a birthday coming up.</Text>
                    </View>
                ) : (
                    <>
                        {renderBirthdaySection("Today's Birthdays", todayBirthdays, true)}
                        {renderBirthdaySection("This Month", thisMonthBirthdays)}
                        {renderBirthdaySection("Upcoming Birthdays", upcomingBirthdays)}
                    </>
                )}
            </ScrollView>
        </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.4)',
        overflow: 'hidden',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginHorizontal: 12,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
    },
    heroBanner: {
        borderRadius: 24,
        overflow: 'hidden',
        paddingVertical: 24,
        paddingHorizontal: 24,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 5,
    },
    heroOrb1: {
        position: 'absolute',
        top: -40,
        right: -20,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFFFFF',
        opacity: 0.6,
    },
    heroOrb2: {
        position: 'absolute',
        bottom: -50,
        left: -30,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#FFFFFF',
        opacity: 0.4,
    },
    heroContent: {
        alignItems: 'center',
    },
    heroIconWrap: {
        backgroundColor: '#FFFFFF',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1E2235',
        marginBottom: 4,
    },
    heroSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    heroStatNum: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1E2235',
    },
    heroStatLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 2,
    },
    birthdaySection: {
        gap: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    birthdaySectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E2235',
        letterSpacing: -0.3,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    onlineDotToday: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#FF6B6B',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    details: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E2235',
        letterSpacing: -0.2,
    },
    meta: {
        fontSize: 13,
        fontWeight: '600',
        color: '#79809B',
    },
    ministryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    ministryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6D28D9',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    greetingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        overflow: 'hidden',
    },
    greetingBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E2235',
        marginBottom: 8,
    },
    placeholderSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
    },
});
