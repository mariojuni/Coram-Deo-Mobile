import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { deleteOfflineBible, getBibleIndex, getChapter, saveBibleIndex, saveChapter } from './offlineDb.repository';

const API_BASE = 'https://api.youversion.com/v1';
const API_KEY = 'RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f';

const getHeaders = () => ({
  'x-yvp-app-key': API_KEY,
  Accept: 'application/json',
});

export const fetchLanguages = async () => {
  const cacheKey = 'bible_languages';
  try {
    const response = await fetch(`${API_BASE}/languages`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch languages');
    const data = await response.json();
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data.data));
    return data.data;
  } catch {
    console.warn('Falling back languages to cache/default due to API error');
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
  }
};

export const fetchVerseOfTheDay = async (translationId = '111') => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const votdRes = await fetch(`${API_BASE}/verse_of_the_days/${dayOfYear}`, { headers: getHeaders() });
    if (!votdRes.ok) return null;
    const votdData = await votdRes.json();
    const passageId = votdData.passage_id || (votdData.data && votdData.data.passage_id);
    if (!passageId) return null;

    const passageRes = await fetch(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`, {
      headers: getHeaders(),
    });
    if (!passageRes.ok) return null;
    const passageData = await passageRes.json();

    return {
      html: passageData.content || (passageData.data && passageData.data.content) || '',
      reference: passageData.reference || (passageData.data && passageData.data.reference),
      passageId,
    };
  } catch (e) {
    console.error('Error fetching Verse of the Day:', e);
    return null;
  }
};

export const fetchBiblesByLanguage = async (languageTag: string) => {
  const cacheKey = `bibles_${languageTag}`;
  try {
    const response = await fetch(`${API_BASE}/bibles?language_ranges[]=${languageTag}&all_available=false`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bibles for language');
    const data = await response.json();

    await AsyncStorage.setItem(cacheKey, JSON.stringify(data.data));
    return data.data;
  } catch {
    console.warn(`Falling back bibles for ${languageTag} to cache/default due to API error`);

    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    if (languageTag.toLowerCase().startsWith('en')) {
      return [
        { id: 111, abbreviation: 'NIV', localized_abbreviation: 'NIV', title: 'New International Version' },
        { id: 59, abbreviation: 'ESV', localized_abbreviation: 'ESV', title: 'English Standard Version' },
        { id: 1, abbreviation: 'KJV', localized_abbreviation: 'KJV', title: 'King James Version' },
        { id: 114, abbreviation: 'NKJV', localized_abbreviation: 'NKJV', title: 'New King James Version' },
        { id: 116, abbreviation: 'NLT', localized_abbreviation: 'NLT', title: 'New Living Translation' },
        { id: 2692, abbreviation: 'NASB2020', localized_abbreviation: 'NASB', title: 'New American Standard Bible 2020' },
        { id: 97, abbreviation: 'MSG', localized_abbreviation: 'MSG', title: 'The Message' },
      ];
    }
    return [];
  }
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
    const response = await fetch(`${API_BASE}/bibles/${translationId}/index`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch bible index');
    const data = await response.json();

    sessionCache.set(cacheKey, data);

    const savedVersions = await getSavedVersions();
    if (savedVersions.some((v: any) => String(v.id) === String(translationId))) {
      await saveBibleIndex(translationId, data);
    }

    return data;
  } catch (error) {
    console.error(`Error fetching index from YouVersion for ${translationId}, falling back to Firestore:`, error);
    try {
      const docRef = doc(db, 'bibles', String(translationId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().index) {
        const fallbackData = docSnap.data().index;
        sessionCache.set(cacheKey, fallbackData);
        return fallbackData;
      }
    } catch (fbError) {
      console.error(`Error fetching index from Firestore for ${translationId}:`, fbError);
    }
    return null;
  }
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
      if (parsed.length === 1 && parsed[0].verseNumber === '1') {
        const repaired = repairSingleVerseText(parsed[0].content, passageId);
        if (repaired) {
          sessionCache.set(cacheKey, repaired);
          return repaired;
        }
      }
      sessionCache.set(cacheKey, parsed);
      return parsed;
    } catch {
      // Ignore parse error and fall back to online
    }
  }

  try {
    const index = await fetchBibleIndex(translationId);
    if (!index) throw new Error('Index not found');

    let verseIds: string[] = [];
    for (const book of index.books) {
      for (const chapter of book.chapters) {
        if (chapter.passage_id === passageId) {
          if (chapter.verses && chapter.verses.length > 0) {
            verseIds = chapter.verses.map((v: any) => v.passage_id);
          }
          break;
        }
      }
    }

    if (verseIds.length === 0) {
      throw new Error('Verses not found in index');
    }

    const versePromises = verseIds.map(async (vId) => {
      const res = await fetch(`${API_BASE}/bibles/${translationId}/passages/${vId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const parts = data.id.split('.');
        const vNum = parts[parts.length - 1];
        return { id: data.id, verseNumber: vNum, content: data.content };
      }
      return null;
    });

    const results = await Promise.all(versePromises);
    const validVerses = results.filter((v) => v !== null);

    sessionCache.set(cacheKey, validVerses);

    const savedVersions = await getSavedVersions();
    if (savedVersions.some((v: any) => String(v.id) === String(translationId))) {
      await saveChapter(translationId, passageId, JSON.stringify(validVerses));
    }

    return validVerses;
  } catch (error) {
    console.error(`Error fetching chapter ${passageId} for ${translationId} from YouVersion, falling back to Firestore:`, error);
    try {
      const docRef = doc(db, 'bibles', String(translationId), 'chapters', passageId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().verses) {
        let fallbackVerses = docSnap.data().verses;
        if (fallbackVerses.length === 1 && fallbackVerses[0].verseNumber === '1') {
          const repaired = repairSingleVerseText(fallbackVerses[0].content, passageId);
          if (repaired) fallbackVerses = repaired;
        }
        sessionCache.set(cacheKey, fallbackVerses);
        return fallbackVerses;
      }
    } catch (fbError) {
      console.error(`Error fetching chapter ${passageId} from Firestore:`, fbError);
    }
    return null;
  }
};

export const downloadBibleOffline = async (translationId: string | number) => {
  try {
    const response = await fetch(`${API_BASE}/bibles/${translationId}/index`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch bible index for download');
    const indexData = await response.json();
    await saveBibleIndex(translationId, indexData);

    const allPassageIds: string[] = [];
    for (const book of indexData.books) {
      for (const chapter of book.chapters) {
        if (chapter.passage_id) {
          allPassageIds.push(chapter.passage_id);
        }
      }
    }

    startBackgroundDownload(translationId, allPassageIds);
    return true;
  } catch (error) {
    console.warn('Error initiating offline download:', error);
    return false;
  }
};

const startBackgroundDownload = async (translationId: string | number, passageIds: string[]) => {
  const BATCH_SIZE = 5;
  for (let i = 0; i < passageIds.length; i += BATCH_SIZE) {
    const batch = passageIds.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (passageId) => {
        const exists = await getChapter(translationId, passageId);
        if (exists) return;

        try {
          const response = await fetch(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`, {
            headers: getHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            const parsedVerses = parseHTMLToJSON(data.content, passageId);
            await saveChapter(translationId, passageId, JSON.stringify(parsedVerses));
          }
        } catch {}
      })
    );

    await new Promise((res) => setTimeout(res, 200));
  }
};

export const getSavedVersions = async () => {
  const saved = await AsyncStorage.getItem('my_bible_versions');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.length > 0) return parsed;
  }

  const defaultVersion = {
    id: 2692,
    abbreviation: 'NASB2020',
    language_tag: 'en',
    localized_abbreviation: 'NASB2020',
    localized_title: 'New American Standard Bible - NASB',
    title: 'New American Standard Bible 2020',
  };

  await AsyncStorage.setItem('my_bible_versions', JSON.stringify([defaultVersion]));
  return [defaultVersion];
};

export const saveVersion = async (version: any) => {
  const saved = await getSavedVersions();
  if (!saved.some((v: any) => String(v.id) === String(version.id))) {
    const newSaved = [...saved, version];
    await AsyncStorage.setItem('my_bible_versions', JSON.stringify(newSaved));
    return newSaved;
  }
  return saved;
};

export const removeVersion = async (versionId: string | number) => {
  const saved = await getSavedVersions();
  const newSaved = saved.filter((v: any) => String(v.id) !== String(versionId));
  await AsyncStorage.setItem('my_bible_versions', JSON.stringify(newSaved));
  await deleteOfflineBible(versionId);
  return newSaved;
};

const defaultPrefs = {
  activeTranslation: '2692',
  activeBook: 'GEN',
  activeChapter: '1',
  activePassageId: 'GEN.1',
  highlights: {},
};

export const getUserPreferences = async () => {
  let data = null;
  
  if (auth.currentUser) {
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'bible', 'preferences');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        data = docSnap.data();
        await AsyncStorage.setItem('bible_prefs', JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Failed to load preferences from Firestore:', error);
    }
  }

  if (!data) {
    const prefs = await AsyncStorage.getItem('bible_prefs');
    if (prefs) data = JSON.parse(prefs);
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

  if (auth.currentUser) {
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'bible', 'preferences');
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
