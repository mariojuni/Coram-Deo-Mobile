import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getActiveAuth, getActiveDb } from '../../../firebase';
import { deleteOfflineBible, getBibleIndex, getChapter, saveBibleIndex, saveChapter } from './offlineDb.repository';

const API_BASE = 'https://api.youversion.com/v1';
const API_KEY = 'RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f';

const getHeaders = () => ({
  'x-yvp-app-key': API_KEY,
  Accept: 'application/json',
  'User-Agent': 'CoramDeo/1.0.0 (Android)',
});

export const fetchLanguages = async () => {
  const cacheKey = 'bible_languages';
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  return [
    {
      id: 39,
      name: 'English',
      name_local: 'English',
      tag: 'eng',
    },
  ];
};

export const fetchVerseOfTheDay = async (translationId = '111'): Promise<any> => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const cacheKey = `votd_${dayOfYear}_${translationId}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore cache read error
  }

  try {
    const votdRes = await fetch(`${API_BASE}/verse_of_the_days/${dayOfYear}`, { headers: getHeaders() });
    if (!votdRes.ok) return null;
    const votdData = await votdRes.json();
    const passageId = votdData.passage_id || (votdData.data && votdData.data.passage_id);
    if (!passageId) return null;

    const passageRes = await fetch(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`, {
      headers: getHeaders(),
    });
    if (!passageRes.ok) {
      if (translationId !== '111') {
        return await fetchVerseOfTheDay('111');
      }
      return null;
    }
    const passageData = await passageRes.json();

    const result = {
      html: passageData.content || (passageData.data && passageData.data.content) || '',
      reference: passageData.reference || (passageData.data && passageData.data.reference),
      passageId,
    };

    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      // Ignore cache write error
    }

    return result;
  } catch (e) {
    console.error('Error fetching Verse of the Day:', e);
    
    // Fallback to previous day if current fails and not in cache
    try {
      const prevDayKey = `votd_${dayOfYear - 1}_${translationId}`;
      const prevCached = await AsyncStorage.getItem(prevDayKey);
      if (prevCached) {
        return JSON.parse(prevCached);
      }
    } catch (cacheErr) {}

    return null;
  }
};

export const fetchBiblesByLanguage = async (languageTag: string) => {
  const cacheKey = `bibles_${languageTag}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  if (languageTag.toLowerCase().startsWith('en')) {
    return [
      { id: 111, abbreviation: 'NIV', localized_abbreviation: 'NIV', title: 'New International Version', contentVersion: 1 },
      { id: 59, abbreviation: 'ESV', localized_abbreviation: 'ESV', title: 'English Standard Version', contentVersion: 1 },
      { id: 1, abbreviation: 'KJV', localized_abbreviation: 'KJV', title: 'King James Version', contentVersion: 1 },
      { id: 114, abbreviation: 'NKJV', localized_abbreviation: 'NKJV', title: 'New King James Version', contentVersion: 1 },
      { id: 116, abbreviation: 'NLT', localized_abbreviation: 'NLT', title: 'New Living Translation', contentVersion: 1 },
      { id: 2692, abbreviation: 'NASB2020', localized_abbreviation: 'NASB', title: 'New American Standard Bible 2020', contentVersion: 1 },
      { id: 97, abbreviation: 'MSG', localized_abbreviation: 'MSG', title: 'The Message', contentVersion: 1 },
    ];
  }
  return [];
};

const repairSingleVerseText = (rawContent: string, passageId: string) => {
  const regex = /(?:^|\s+)(\d+)\s+/g;
  const matches = [...rawContent.matchAll(regex)];

  const verses = [];
  for (let i = 0; i < matches.length; i++) {
    const vNum = parseInt(matches[i][1], 10);
    if (verses.length === 0) {
      if (vNum === 1) {
        verses.push({ index: matches[i].index!, length: matches[i][0].length, num: '1' });
      }
    } else {
      const lastNum = parseInt(verses[verses.length - 1].num, 10);
      if (vNum > lastNum && vNum <= lastNum + 5) {
        verses.push({ index: matches[i].index!, length: matches[i][0].length, num: matches[i][1] });
      }
    }
  }

  if (verses.length > 1) {
    const finalData = [];
    for (let i = 0; i < verses.length; i++) {
      const v = verses[i];
      const startIndex = v.index + v.length;
      const endIndex = i + 1 < verses.length ? verses[i + 1].index : rawContent.length;
      finalData.push({
        id: `${passageId}.${v.num}`,
        verseNumber: v.num,
        content: rawContent.substring(startIndex, endIndex).trim(),
      });
    }
    return finalData;
  }
  return null;
};

const parseHTMLToJSON = (html: string, passageId: string) => {
  const verses = [];
  const verseRegex = /<span[^>]*class="[^"]*yv-v[^"]*"[^>]*v="(\d+)"[^>]*>(.*?)<\/span>(.*?)(?=<span[^>]*class="[^"]*yv-v|$)/gs;
  let match;

  while ((match = verseRegex.exec(html)) !== null) {
    const verseNumber = match[1];
    const rawText = (match[2] + ' ' + match[3]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (rawText.length > 0) {
      verses.push({ id: `${passageId}.${verseNumber}`, verseNumber, content: rawText });
    }
  }

  if (verses.length === 0 && html.length > 0) {
    const rawText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const repaired = repairSingleVerseText(rawText, passageId);
    if (repaired) {
      return repaired;
    }
    verses.push({
      id: passageId,
      verseNumber: '1',
      content: rawText,
    });
  }
  return verses;
};

const sessionCache = new Map<string, any>();

/** Synchronous cache lookup — returns data if already fetched this session, else null. */
export const getChapterFromCache = (translationId: string | number, passageId: string) => {
  const cacheKey = `chapter-${translationId}-${passageId}`;
  return sessionCache.has(cacheKey) ? sessionCache.get(cacheKey) : null;
};

export const fetchBibleIndex = async (translationId: string | number) => {
  const cacheKey = `index-${translationId}`;
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  const offlineIndex = await getBibleIndex(translationId);
  if (offlineIndex) {
    sessionCache.set(cacheKey, offlineIndex);
    return offlineIndex;
  }

  try {
    const docRef = doc(getActiveDb(), 'bibles', String(translationId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().index) {
      const fallbackData = docSnap.data().index;
      sessionCache.set(cacheKey, fallbackData);

      const savedVersions = await getSavedVersions();
      if (savedVersions.some((v: any) => String(v.id) === String(translationId))) {
        await saveBibleIndex(translationId, fallbackData);
      }
      return fallbackData;
    }
  } catch (fbError) {
    console.error(`Error fetching index from Firestore for ${translationId}:`, fbError);
  }
  return null;
};

export const fetchChapterData = async (translationId: string | number, passageId: string) => {
  const cacheKey = `chapter-${translationId}-${passageId}`;
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  const offlineChapterStr = await getChapter(translationId, passageId);
  if (offlineChapterStr) {
    try {
      const parsed = JSON.parse(offlineChapterStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (parsed.length === 1 && parsed[0].verseNumber === '1') {
          const repaired = repairSingleVerseText(parsed[0].content, passageId);
          if (repaired) {
            sessionCache.set(cacheKey, repaired);
            return repaired;
          }
        }
        sessionCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {
      // Ignore parse error and fall back
    }
  }

  try {
    const docRef = doc(getActiveDb(), 'bibles', String(translationId), 'chapters', passageId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().verses) {
      let fallbackVerses = docSnap.data().verses;
      if (fallbackVerses.length === 1 && fallbackVerses[0].verseNumber === '1') {
        const repaired = repairSingleVerseText(fallbackVerses[0].content, passageId);
        if (repaired) fallbackVerses = repaired;
      }
      sessionCache.set(cacheKey, fallbackVerses);

      const savedVersions = await getSavedVersions();
      if (savedVersions.some((v: any) => String(v.id) === String(translationId))) {
        await saveChapter(translationId, passageId, JSON.stringify(fallbackVerses));
      }
      return fallbackVerses;
    }
  } catch (fbError) {
    console.error(`Error fetching chapter ${passageId} from Firestore:`, fbError);
  }
  return null;
};

export const downloadBibleOffline = async (translationId: string | number) => {
  // Legacy offline download is no longer supported directly via API.
  // Use BibleDataService instead.
  return false;
};

const startBackgroundDownload = async (translationId: string | number, passageIds: string[]) => {
  // Deprecated
};

export const getSavedVersions = async () => {
  const saved = await AsyncStorage.getItem('my_bible_versions');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length > 0) return parsed;
  }

  let remoteContentVersion = 1;
  try {
    const docRef = doc(getActiveDb(), 'bibleVersions', '59');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      remoteContentVersion = docSnap.data().contentVersion || 1;
    }
  } catch (e) {
    // Ignore if offline
  }

  const defaultVersion = {
    id: 59,
    abbreviation: 'ESV',
    language_tag: 'en',
    localized_abbreviation: 'ESV',
    localized_title: 'English Standard Version',
    title: 'English Standard Version',
    _localContentVersion: remoteContentVersion,
    _downloadedAt: Date.now(),
  };

  await AsyncStorage.setItem('my_bible_versions', JSON.stringify([defaultVersion]));
  return [defaultVersion];
};

export const saveVersion = async (version: any) => {
  const saved = await getSavedVersions();
  if (!saved.some((v: any) => String(v.id) === String(version.id))) {
    // Always persist contentVersion so we can detect updates later
    const versionWithMeta = {
      ...version,
      _localContentVersion: version.contentVersion ?? null,
      _downloadedAt: Date.now(),
    };
    const newSaved = [...saved, versionWithMeta];
    await AsyncStorage.setItem('my_bible_versions', JSON.stringify(newSaved));
    return newSaved;
  }
  return saved;
};

/**
 * Fetches the latest contentVersion from Firestore for each saved version
 * and compares against the locally stored _localContentVersion.
 * Returns a map of versionId -> { hasUpdate: boolean, remoteVersion: number }
 */
export const checkForVersionUpdates = async (): Promise<Record<string, { hasUpdate: boolean; remoteVersion: number }>> => {
  const saved = await getSavedVersions();
  const result: Record<string, { hasUpdate: boolean; remoteVersion: number }> = {};

  await Promise.allSettled(
    saved.map(async (v: any) => {
      // Only check Firestore-sourced versions (they have a numeric translationId stored as string)
      const id = String(v.id);
      const localVersion: number = v._localContentVersion ?? 0;
      try {
        const docRef = doc(getActiveDb(), 'bibleVersions', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const remoteVersion: number = docSnap.data().contentVersion ?? 1;
          result[id] = {
            hasUpdate: remoteVersion > localVersion,
            remoteVersion,
          };
        }
      } catch {
        // Silently skip — don't block UI if offline
      }
    })
  );

  return result;
};

/**
 * Re-downloads a bible version from Firestore (to apply an update).
 * Updates the stored _localContentVersion after successful download.
 */
export const redownloadVersion = async (versionId: string | number, remoteVersion: number): Promise<boolean> => {
  try {
    // Clear the cached offline data so it re-fetches
    await deleteOfflineBible(versionId);

    // Download fresh copy
    const { bibleDataService } = await import('./BibleDataService');
    const success = await bibleDataService.downloadVersion(String(versionId));
    if (!success) return false;

    // Update stored _localContentVersion
    const saved = await getSavedVersions();
    const updated = saved.map((v: any) =>
      String(v.id) === String(versionId)
        ? { ...v, _localContentVersion: remoteVersion, _downloadedAt: Date.now() }
        : v
    );
    await AsyncStorage.setItem('my_bible_versions', JSON.stringify(updated));
    return true;
  } catch (e) {
    console.warn('redownloadVersion failed:', e);
    return false;
  }
};

export const removeVersion = async (versionId: string | number) => {
  const saved = await getSavedVersions();
  const newSaved = saved.filter((v: any) => String(v.id) !== String(versionId));
  await AsyncStorage.setItem('my_bible_versions', JSON.stringify(newSaved));
  await deleteOfflineBible(versionId);
  return newSaved;
};

const defaultPrefs = {
  activeTranslation: '59',
  activeBook: 'GEN',
  activeChapter: '1',
  activePassageId: 'GEN.1',
  highlights: {},
};

export const getUserPreferences = async () => {
  let data = null;

  try {
    const prefs = await AsyncStorage.getItem('bible_prefs');
    if (prefs) data = JSON.parse(prefs);
  } catch (e) {
    console.warn('Failed to read bible_prefs from AsyncStorage:', e);
  }

  const currentUser = getActiveAuth().currentUser;
  if (currentUser) {
    if (!data) {
      try {
        const docRef = doc(getActiveDb(), 'users', currentUser.uid, 'bible', 'preferences');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          data = docSnap.data();
          await AsyncStorage.setItem('bible_prefs', JSON.stringify(data));
        }
      } catch (error: any) {
        if (error?.message?.includes('offline') || error?.code === 'unavailable') {
          console.log('Client offline, using local bible preferences.');
        } else {
          console.warn('Failed to load preferences from Firestore:', error);
        }
      }
    } else {
      // Async background sync from Firestore so UI isn't blocked
      getDoc(doc(getActiveDb(), 'users', currentUser.uid, 'bible', 'preferences'))
        .then((docSnap) => {
          if (docSnap.exists()) {
            AsyncStorage.setItem('bible_prefs', JSON.stringify(docSnap.data()));
          }
        })
        .catch(() => {});
    }
  }

  const merged = { ...defaultPrefs };
  if (data) {
    if (data.activeTranslation) merged.activeTranslation = data.activeTranslation;
    if (data.activeBook) merged.activeBook = data.activeBook;
    if (data.activeChapter) merged.activeChapter = data.activeChapter;
    if (data.activePassageId) merged.activePassageId = data.activePassageId;
    if (data.highlights) merged.highlights = data.highlights;
  }

  return merged;
};

export const saveUserPreferences = async (prefs: any) => {
  await AsyncStorage.setItem('bible_prefs', JSON.stringify(prefs));

  const currentUser = getActiveAuth().currentUser;
  if (currentUser) {
    try {
      const docRef = doc(getActiveDb(), 'users', currentUser.uid, 'bible', 'preferences');
      await setDoc(docRef, prefs, { merge: true });
    } catch (error) {
      console.warn('Failed to save preferences to Firestore:', error);
    }
  }
};

export const fetchOrganization = async (orgId: string) => {
  if (!orgId) return null;
  try {
    const response = await fetch(`${API_BASE}/organizations/${orgId}`, { headers: getHeaders() });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};
