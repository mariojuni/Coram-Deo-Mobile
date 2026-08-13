import { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getActiveDb } from '@/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useBiblePlanStore } from '@/store/useBiblePlanStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { discipleshipGroupRepository } from '@/features/discipleshipGroup/data/discipleshipGroup.repository';
import type { DiscipleshipGroup, DiscipleshipLesson } from '@/features/discipleshipGroup/domain/discipleshipGroup.types';
import { sermonRepository } from '@/features/sermons/data/sermon.repository';
import { isUserInMinistry } from '@/features/member/domain/member.utils';
import type { SermonNote } from '@/features/sermons/domain/sermon.types';
import { getUserPreferences, saveUserPreferences, fetchChapterData } from '@/features/bible/data/bible.repository';
import type { SystemRole } from '@/features/auth/domain/auth.types';
import { bibleHighlightRepository } from '@/features/bibleHighlights/data/bibleHighlight.repository';
import type { BibleNote } from '@/features/bibleNotes/domain/bibleNote.types';
import { bibleNoteRepository } from '@/features/bibleNotes/data/bibleNote.repository';

export type DashboardNoteItem = (SermonNote & { _type: 'sermon' }) | (BibleNote & { _type: 'bible' });

export interface UserHighlightItem {
  id: string;
  passageId: string;
  bookName: string;
  chapter: number;
  verseNumber: number;
  verseRangeLabel: string;
  verseNumbers: number[];
  color: string;
  text?: string;
  createdAt?: string;
  likes?: number;
  likedBy?: string[];
  commentCount?: number;
}

export interface UserMinistryMembership {
  id: string;
  ministryId: string;
  ministryName: string;
  ministryRole: string;
}

export function useProfileDashboardData() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);

  const churchId = userProfile?.churchId ?? null;
  const userId = currentUser?.uid ?? null;
  const memberId = userProfile?.memberId ?? null;

  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(true);
  const [currentLessons, setCurrentLessons] = useState<Record<string, DiscipleshipLesson | null>>({});
  const [groupLessons, setGroupLessons] = useState<Record<string, DiscipleshipLesson[]>>({});

  const [userMinistries, setUserMinistries] = useState<UserMinistryMembership[]>([]);
  const [ministriesLoading, setMinistriesLoading] = useState<boolean>(true);

  const [highlights, setHighlights] = useState<UserHighlightItem[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState<boolean>(true);

  const [notes, setNotes] = useState<DashboardNoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(true);

  const userBiblePlans = useBiblePlanStore((s) => s.userBiblePlans);
  const userBiblePlansLoading = useBiblePlanStore((s) => s.userBiblePlansLoading);
  const plans = useBiblePlanStore((s) => s.plans);
  const initializeUserBiblePlansListener = useBiblePlanStore((s) => s.initializeUserBiblePlansListener);

  const { ministries, fetchMinistries } = useMinistryStore();

  // 1. Subscribe to Discipleship Groups
  useEffect(() => {
    if (!userProfile || !churchId) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }
    setGroupsLoading(true);
    const unsub = discipleshipGroupRepository.subscribeToUserGroups(
      userProfile,
      async (userGroups) => {
        setGroups(userGroups);
        setGroupsLoading(false);

        // Fetch lesson meta for assigned groups that have a plan
        const lessonMap: Record<string, DiscipleshipLesson | null> = {};
        const groupLessonsMap: Record<string, DiscipleshipLesson[]> = {};
        for (const g of userGroups) {
          if (g.planId) {
            const { lessons } = await discipleshipGroupRepository.getPlanWithLessons(churchId, g.planId);
            groupLessonsMap[g.id] = lessons;
            const weekNum = g.currentWeekNumber || 1;
            const found = lessons.find((l) => l.weekNumber === weekNum) || lessons[0] || null;
            lessonMap[g.id] = found;
          } else {
            lessonMap[g.id] = null;
            groupLessonsMap[g.id] = [];
          }
        }
        setCurrentLessons(lessonMap);
        setGroupLessons(groupLessonsMap);
      },
      (err) => {
        console.warn('Error subscribing to user groups:', err);
        setGroupsLoading(false);
      }
    );

    return () => unsub();
  }, [userProfile, churchId]);

  // 2. Fetch User Ministry Memberships
  useEffect(() => {
    if (!churchId) {
      setUserMinistries([]);
      setMinistriesLoading(false);
      return;
    }

    let isMounted = true;
    const loadMinistries = async () => {
      setMinistriesLoading(true);
      try {
        await fetchMinistries(churchId);
        
        // Query ministryMembers collection for user/member
        const memberships: UserMinistryMembership[] = [];
        const memSet = new Set<string>();

        if (memberId || userId) {
          const qRef = collection(getActiveDb(), 'ministryMembers');
          let docsSnap: any[] = [];
          if (memberId) {
            const q1 = query(qRef, where('memberId', '==', memberId));
            const s1 = await getDocs(q1);
            docsSnap.push(...s1.docs);
          }
          if (userId) {
            const q2 = query(qRef, where('userId', '==', userId));
            const s2 = await getDocs(q2);
            docsSnap.push(...s2.docs);
          }

          docsSnap.forEach((d) => {
            const data = d.data();
            
            // Local filter to bypass composite index requirement
            if (data.churchId !== churchId || data.status !== 'active') {
              return;
            }

            const minId = data.ministryId;
            if (minId && !memSet.has(minId)) {
              memSet.add(minId);
              const minObj = ministries.find((m) => m.id === minId);
              memberships.push({
                id: d.id,
                ministryId: minId,
                ministryName: minObj?.name || data.ministryName || 'Ministry',
                ministryRole: data.ministryRole || 'Member',
              });
            }
          });
        }

        // Also check if user is in leaderMemberIds / managedMinistryIds of any ministry
        // and also check if user is in the embedded `members` array.
        ministries.forEach((m) => {
          if (!memSet.has(m.id)) {
            const isLeader =
              (memberId && m.leaderId === memberId) ||
              (userId && m.leaderId === userId) ||
              (userProfile?.managedMinistryIds?.includes(m.id));
              
            const isEmbeddedMember = isUserInMinistry(m.members, currentUser, userProfile);

            if (isLeader) {
              memSet.add(m.id);
              memberships.push({
                id: `leader_${m.id}`,
                ministryId: m.id,
                ministryName: m.name,
                ministryRole: 'Leader',
              });
            } else if (isEmbeddedMember) {
              memSet.add(m.id);
              
              // Find role if specified in embedded member data
              const ids = [currentUser?.uid, userProfile?.memberId].filter(Boolean);
              const memberData = m.members?.find(mem => ids.includes(mem.memberId));
              
              memberships.push({
                id: `embedded_${m.id}`,
                ministryId: m.id,
                ministryName: m.name,
                ministryRole: memberData?.role || 'Member',
              });
            }
          }
        });

        if (isMounted) {
          setUserMinistries(memberships);
          setMinistriesLoading(false);
        }
      } catch (err) {
        console.error('Error fetching user ministries:', err);
        if (isMounted) setMinistriesLoading(false);
      }
    };

    loadMinistries();
    return () => {
      isMounted = false;
    };
  }, [churchId, userId, memberId, fetchMinistries, ministries.length, userProfile?.managedMinistryIds]);

  // 3. Fetch Highlights
  const loadHighlights = useCallback(async () => {
    if (!userId) {
      setHighlights([]);
      setHighlightsLoading(false);
      return;
    }
    setHighlightsLoading(true);
    try {
      const result = await bibleHighlightRepository.getUserHighlights(userId);
      const items: UserHighlightItem[] = result.map(h => ({
        id: h.id,
        passageId: h.passageId || `${h.bookName}.${h.chapter}`,
        bookName: h.bookName,
        chapter: h.chapter,
        verseNumber: h.verseNumber,
        verseRangeLabel: h.verseRangeLabel,
        verseNumbers: h.verseNumbers,
        color: h.color,
        text: h.text,
        createdAt: h.createdAt?.toDate ? h.createdAt.toDate().toISOString() : h.createdAt?.toString(),
        likes: h.likes,
        likedBy: h.likedBy,
        commentCount: h.commentCount,
      }));

      // Sort highlights from latest created to oldest
      items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setHighlights(items);
    } catch (err) {
      console.warn('Failed to fetch user highlights:', err);
    } finally {
      setHighlightsLoading(false);
    }
  }, [userId]);

  const removeHighlight = useCallback(async (highlightId: string) => {
    try {
      await bibleHighlightRepository.deleteHighlight(highlightId);
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (e) {
      console.error('Failed to remove highlight:', e);
    }
  }, []);

  const removeNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const toggleHighlightLike = useCallback(async (id: string, uid: string) => {
    // Optimistic update
    setHighlights((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const likedBy = h.likedBy || [];
        const isLiked = likedBy.includes(uid);
        const nextLikedBy = isLiked ? likedBy.filter((x) => x !== uid) : [...likedBy, uid];
        return {
          ...h,
          likes: Math.max(0, (h.likes || 0) + (isLiked ? -1 : 1)),
          likedBy: nextLikedBy,
        };
      })
    );
    // Persist
    try {
      await bibleHighlightRepository.toggleLike(id, uid);
    } catch (e) {
      console.error('Failed to toggle like on highlight:', e);
      // Revert in case of failure could be added here
    }
  }, []);

  const toggleNoteLike = useCallback((id: string, uid: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      if (n._type === 'sermon') return n;
      const likedBy = n.likedBy || [];
      const isLiked = likedBy.includes(uid);
      const nextLikedBy = isLiked
        ? likedBy.filter((userId: string) => userId !== uid)
        : [...likedBy, uid];
      return {
        ...n,
        likes: Math.max(0, (n.likes || 0) + (isLiked ? -1 : 1)),
        likedBy: nextLikedBy,
      };
    }));
  }, []);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // 4. Fetch Notes
  useEffect(() => {
    if (!userId || !churchId) {
      setNotes([]);
      setNotesLoading(false);
      return;
    }
    setNotesLoading(true);

    Promise.all([
      sermonRepository.fetchUserNotes(userId, churchId).catch(err => {
        console.warn('Failed to fetch sermon notes:', err);
        return [];
      }),
      bibleNoteRepository.getUserNotes(userId).catch(err => {
        console.warn('Failed to fetch bible notes:', err);
        return [];
      })
    ]).then(([sermonNotes, bibleNotes]) => {
      const combined: DashboardNoteItem[] = [
        ...sermonNotes.map(n => ({ ...n, _type: 'sermon' as const })),
        ...bibleNotes.map(n => ({ ...n, _type: 'bible' as const }))
      ];
      combined.sort((a, b) => {
        const timeA = a.createdAt && (a.createdAt as any).toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
        const timeB = b.createdAt && (b.createdAt as any).toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
        return timeB - timeA;
      });
      setNotes(combined);
      setNotesLoading(false);
    }).catch(err => {
      console.warn('Failed to fetch combined notes:', err);
      setNotesLoading(false);
    });
  }, [userId, churchId]);

  // 5. User Bible Plans Listener
  useEffect(() => {
    if (!userId || !churchId) return;
    const unsub = initializeUserBiblePlansListener(userId, churchId);
    return () => unsub();
  }, [userId, churchId, initializeUserBiblePlansListener]);

  const activePlans = useMemo(() => {
    return userBiblePlans.filter((p) => p.status === 'active');
  }, [userBiblePlans]);

  // Derive role chips
  const roleChips = useMemo(() => {
    const chips: string[] = [];
    const roles: SystemRole[] = Array.isArray(userProfile?.systemRoles) && userProfile.systemRoles.length > 0
      ? userProfile.systemRoles
      : (userProfile?.role ? [userProfile.role as SystemRole] : ['member']);

    const roleMap: Record<SystemRole, string> = {
      super_admin: 'Super Admin',
      church_admin: 'Church Admin',
      pastor: 'Pastor',
      secretary: 'Secretary',
      finance_admin: 'Finance Admin',
      ministry_leader: 'Ministry Leader',
      member: 'Member',
    };

    roles.forEach((r) => {
      const label = roleMap[r];
      if (label && !chips.includes(label)) {
        chips.push(label);
      }
    });

    // Check if leader in any discipleship group
    const isGroupLeader = groups.some((g) =>
      (memberId && g.leaderMemberIds?.includes(memberId)) ||
      (userId && g.leaderUserIds?.includes(userId))
    );
    if (isGroupLeader && !chips.includes('Group Leader')) {
      chips.push('Group Leader');
    }

    if (chips.length === 0) {
      chips.push('Member');
    }

    return chips;
  }, [userProfile?.systemRoles, userProfile?.role, groups, memberId, userId]);

  return {
    userProfile,
    currentUser,
    churchId,
    roleChips,
    groups,
    groupsLoading,
    currentLessons,
    groupLessons,
    userMinistries,
    ministriesLoading,
    highlights,
    highlightsLoading,
    notes,
    notesLoading,
    activePlans,
    plans,
    plansLoading: userBiblePlansLoading,
    stats: {
      highlightsCount: highlights.length,
      notesCount: notes.length,
      plansCount: activePlans.length,
      groupsCount: groups.length,
      ministriesCount: userMinistries.length,
    },
    refreshHighlights: loadHighlights,
    removeHighlight,
    removeNote,
    toggleNoteLike,
    toggleHighlightLike,
  };
}
