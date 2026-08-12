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
import { churchHighlightRepository } from '@/features/bible/data/churchHighlight.repository';

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

  const [notes, setNotes] = useState<SermonNote[]>([]);
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
    setHighlightsLoading(true);
    try {
      const prefs = await getUserPreferences();
      const rawHighlights = (prefs as any)?.highlights || {};
      const activeTranslation = (prefs as any)?.activeTranslation || '2692';
      const items: UserHighlightItem[] = [];

      const passageEntries = Object.entries(rawHighlights).filter(
        ([_, verses]) => verses && typeof verses === 'object'
      );

      const chapterResults = await Promise.all(
        passageEntries.map(async ([passageId, verses]) => {
          let chapterData: any[] = [];
          try {
            chapterData = (await fetchChapterData(activeTranslation, passageId)) || [];
          } catch (_) {}
          return { passageId, verses: verses as Record<string, string>, chapterData };
        })
      );

      for (const { passageId, verses, chapterData } of chapterResults) {
        const [book, chapter] = passageId.split('.');
        const parsedChapter = parseInt(chapter, 10) || 1;
        const bName = book || passageId;

        // Group verse numbers by highlight color & track createdAt timestamp
        // Group verse numbers by color AND createdAt timestamp so same-session highlights merge together
        const timeMap: Record<string, { vNum: number; color: string; createdAt?: string }[]> = {};
        for (const [verseStr, val] of Object.entries(verses)) {
          const vNum = parseInt(verseStr, 10);
          if (isNaN(vNum)) continue;

          let color = String(val);
          let createdAt = '';
          if (typeof val === 'object' && val !== null) {
            color = String((val as any).color || 'yellow');
            createdAt = (val as any).createdAt || '';
          }

          const groupKey = `${color}_${createdAt || 'legacy'}`;
          if (!timeMap[groupKey]) timeMap[groupKey] = [];
          timeMap[groupKey].push({ vNum, color, createdAt });
        }

        for (const verseItems of Object.values(timeMap)) {
          if (verseItems.length === 0) continue;
          verseItems.sort((a, b) => a.vNum - b.vNum);
          const color = verseItems[0].color;
          const rangeCreatedAt = verseItems.map(r => r.createdAt).filter(Boolean).sort().pop();

          // Build broken verse ranges (e.g. 11, 14-16)
          const ranges: string[] = [];
          let rangeStart = verseItems[0].vNum;
          let prev = verseItems[0].vNum;

          for (let i = 1; i < verseItems.length; i++) {
            const curr = verseItems[i].vNum;
            if (curr === prev + 1) {
              prev = curr;
            } else {
              ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
              rangeStart = curr;
              prev = curr;
            }
          }
          ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
          const label = ranges.join(',');

          const combinedTexts: string[] = [];
          const vNumbers: number[] = [];
          for (const item of verseItems) {
            vNumbers.push(item.vNum);
            const textObj = chapterData.find((v: any) => parseInt(String(v.verseNumber), 10) === item.vNum);
            if (textObj?.content) {
              const cleanContent = textObj.content.replace(/{{note:[0-9]+}}/g, '').trim();
              combinedTexts.push(cleanContent);
            }
          }

          const firstNum = verseItems[0].vNum;
          const lastNum = verseItems[verseItems.length - 1].vNum;

          items.push({
            id: `${passageId}_${color}_${firstNum}_${lastNum}_${rangeCreatedAt || ''}`,
            passageId,
            bookName: bName,
            chapter: parsedChapter,
            verseNumber: firstNum,
            verseRangeLabel: label,
            verseNumbers: vNumbers,
            color,
            text: combinedTexts.join(' '),
            createdAt: rangeCreatedAt,
          });
        }
      }

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
  }, []);

  const removeHighlight = useCallback(async (passageId: string, verseNumbersOrNumber: number | number[]) => {
    try {
      const prefs = await getUserPreferences();
      const targets = Array.isArray(verseNumbersOrNumber) ? verseNumbersOrNumber : [verseNumbersOrNumber];
      
      let modified = false;
      for (const vNum of targets) {
        const vKey = String(vNum);
        if ((prefs as any)?.highlights?.[passageId]?.[vKey]) {
          delete (prefs as any).highlights[passageId][vKey];
          modified = true;
        }
      }

      if (modified) {
        if (Object.keys((prefs as any).highlights[passageId] || {}).length === 0) {
          delete (prefs as any).highlights[passageId];
        }
        await saveUserPreferences(prefs);
        setHighlights((prev) =>
          prev.filter((h) => !(h.passageId === passageId && targets.includes(h.verseNumber)))
        );

        // Remove from church highlights feed
        const effectiveChurchId = userProfile?.churchId || (currentUser as any)?.churchId || (currentUser as any)?.claims?.churchId;
        if (effectiveChurchId && currentUser?.uid) {
          churchHighlightRepository.deleteHighlightByVerse(
            effectiveChurchId,
            currentUser.uid,
            passageId,
            targets
          ).catch(err => console.warn('[useProfileDashboardData] Failed to delete church highlight:', err));
        }
      }
    } catch (e) {
      console.error('Failed to remove highlight:', e);
    }
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
    sermonRepository
      .fetchUserNotes(userId, churchId)
      .then((userNotes) => {
        setNotes(userNotes);
        setNotesLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to fetch user notes:', err);
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
  };
}
