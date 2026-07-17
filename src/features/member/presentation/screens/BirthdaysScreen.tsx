import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, Cake, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

    const renderBirthdaySection = (title: string, data: any[]) => {
        if (data.length === 0) return null;
        return (
            <View style={styles.birthdaySection}>
                <Text style={styles.birthdaySectionTitle}>{title}</Text>
                {data.map(member => (
                    <View key={member.id} style={styles.card}>
                        <Image
                            source={{ uri: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatMemberName(member))}&background=f0f0f0&color=999` }}
                            style={styles.avatar}
                        />
                        <View style={styles.details}>
                            <Text style={styles.name}>{formatMemberName(member)}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Cake size={12} color="#D97706" />
                                <Text style={styles.meta}>{formatBirthday(member)}</Text>
                            </View>
                            {member.ministryIds && member.ministryIds.length > 0 && (
                                <Text style={styles.ministryMeta}>Ministry member</Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.greetingBtn} onPress={() => sendGreeting(member)}>
                            <Send size={14} color="#D97706" />
                            <Text style={styles.greetingBtnText}>Send</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#1E2235" />
                </TouchableOpacity>
                <Text style={styles.title}>Birthdays</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
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
                        {renderBirthdaySection("Today's Birthdays", todayBirthdays)}
                        {renderBirthdaySection("This Month", thisMonthBirthdays)}
                        {renderBirthdaySection("Upcoming Birthdays", upcomingBirthdays)}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E2235',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
        gap: 24,
    },
    birthdaySection: {
        gap: 12,
    },
    birthdaySectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E2235',
        marginBottom: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    details: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E2235',
        marginBottom: 2,
    },
    meta: {
        fontSize: 13,
        fontWeight: '600',
        color: '#D97706',
    },
    ministryMeta: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    greetingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    greetingBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D97706',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E2235',
        marginBottom: 8,
    },
    placeholderSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});
