import { DeviceEventEmitter } from 'react-native';
export const BIBLE_DOWNLOAD_COMPLETED_EVENT = 'BIBLE_DOWNLOAD_COMPLETED';

import { FirestoreBibleRepository } from './FirestoreBibleRepository';
import { 
  BibleRepository, 
  BibleLanguage, 
  BibleVersionSummary, 
  BibleVersionDetails, 
  BibleBook, 
  BibleChapter,
  VerseComparisonEntry
} from '../domain/BibleRepository';
import { fetchLanguages, fetchBiblesByLanguage, fetchBibleIndex, fetchChapterData, getChapterFromCache, getSavedVersions, saveVersion, removeVersion, downloadBibleOffline, getUserPreferences, saveUserPreferences, fetchOrganization } from './bible.repository';
import { 
  getChapter, 
  saveChapter, 
  deleteOfflineBible, 
  getBibleBooks, 
  saveBibleBooks, 
  saveChaptersBatch, 
  saveTranslationMeta, 
  saveBibleIndex,
  isBibleOffline,
  getDownloadedTranslations,
  getOfflinePassageForTranslations
} from './offlineDb.repository';

import { getHumanReadableBookName, extractChapterNumber } from '@/utils/scriptureReferenceParser';

export class BibleDataService implements BibleRepository {
  private firestoreRepo: FirestoreBibleRepository;

  constructor() {
    this.firestoreRepo = new FirestoreBibleRepository();
  }

  async getLanguages(): Promise<BibleLanguage[]> {
    // Phase 3: Try to get global languages first
    const globalLanguages = await this.firestoreRepo.getLanguages();
    if (globalLanguages.length > 0) {
      return globalLanguages;
    }
    
    // Fallback for backwards compatibility during migration
    const legacyLanguages = await fetchLanguages();
    return legacyLanguages.map((l: any) => ({
      id: l.tag,
      iso6393: l.tag,
      name: l.name,
      localName: l.name_local || l.name,
      textDirection: 'ltr',
    })) as BibleLanguage[];
  }

  async getVersions(languageTag?: string): Promise<BibleVersionSummary[]> {
    const globalVersions = await this.firestoreRepo.getVersions(languageTag);
    if (globalVersions.length > 0) {
      return globalVersions;
    }

    if (languageTag) {
      const legacyVersions = await fetchBiblesByLanguage(languageTag);
      return legacyVersions.map((v: any) => ({
        id: String(v.id),
        translationId: String(v.id),
        abbreviation: v.abbreviation,
        localAbbreviation: v.localized_abbreviation,
        title: v.title,
        localTitle: v.localized_title,
        languageTag: languageTag,
      })) as BibleVersionSummary[];
    }
    
    return [];
  }

  async getVersionDetails(versionId: string): Promise<BibleVersionDetails> {
    try {
      return await this.firestoreRepo.getVersionDetails(versionId);
    } catch (e) {
      // Fallback
      const legacyIndex = await fetchBibleIndex(versionId);
      if (legacyIndex) {
        return {
          id: String(versionId),
          translationId: String(versionId),
          abbreviation: legacyIndex.abbreviation || '',
          title: legacyIndex.title || '',
          languageTag: legacyIndex.language?.tag || 'en',
          bookCount: legacyIndex.books?.length || 0,
          chapterCount: 0,
          verseCount: 0,
          sourceFormat: 'legacy',
          status: 'published',
          contentVersion: 1
        };
      }
      throw e;
    }
  }

  async getBooks(versionId: string): Promise<BibleBook[]> {
    // 1. Try local SQLite offline storage first
    try {
      const localBooks = await getBibleBooks(versionId);
      if (localBooks && localBooks.length > 0) {
        return localBooks;
      }
    } catch (e) {
      console.warn(`[BibleDataService] Error checking local books for ${versionId}:`, e);
    }

    // 2. Fetch from Firestore global library
    try {
      const globalBooks = await this.firestoreRepo.getBooks(versionId);
      if (globalBooks && globalBooks.length > 0) {
        // Cache to local SQLite for offline access
        saveBibleBooks(versionId, globalBooks).catch(console.warn);
        return globalBooks;
      }
    } catch (e) {
      // ignore and fallback
    }

    // 3. Fallback to legacy index
    try {
      const legacyIndex = await fetchBibleIndex(versionId);
      if (legacyIndex && legacyIndex.books) {
        const mappedBooks: BibleBook[] = legacyIndex.books.map((b: any, index: number) => {
          const bookId = b.usfm || b.id || String(index);
          const chapters = Array.isArray(b.chapters)
            ? b.chapters.map((c: any, cIdx: number) => {
                const chNum = extractChapterNumber(c, cIdx);
                return {
                  id: chNum,
                  human_reference: chNum,
                  passage_id: c?.passage_id || `${bookId}.${chNum}`,
                };
              })
            : undefined;
          return {
            id: bookId,
            usfm: b.usfm || b.id || String(index),
            name: b.name || b.human,
            longName: b.long_name,
            abbreviation: b.abbreviation,
            canon: 'other',
            order: index,
            chapterCount: Number(b.chapterCount || chapters?.length || 0),
            chapters,
          };
        });
        // Cache to local SQLite for offline access
        saveBibleBooks(versionId, mappedBooks).catch(console.warn);
        return mappedBooks;
      }
    } catch (e) {
      console.warn(`[BibleDataService] Error fetching legacy index for ${versionId}:`, e);
    }

    return [];
  }

  private activeDownloads: Map<string, Promise<boolean>> = new Map();

  async getChapter(versionId: string, bookId: string, chapter: number): Promise<BibleChapter> {
    const passageId = `${bookId}.${chapter}`;

    // 1. Try to get from SQLite offline cache first
    let offlineChapterStr = await getChapter(versionId, passageId);

    // If still missing, check if it's a JSON-backed version and trigger a download on-demand
    if (!offlineChapterStr) {
      try {
        // Only trigger if we aren't already downloading it
        if (!this.activeDownloads.has(String(versionId))) {
          const versionDetails = await this.firestoreRepo.getVersionDetails(versionId);
          if (versionDetails?.sourceStoragePath) {
            // Trigger download asynchronously (do not await)
            this.downloadVersion(versionId).catch(console.warn);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch JSON on demand, falling back to Firestore', e);
      }
    }

    if (offlineChapterStr) {
      try {
        const parsed = JSON.parse(offlineChapterStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            versionId: String(versionId),
            bookId,
            chapterNumber: chapter,
            verses: parsed,
          };
        }
      } catch (e) {
        console.warn('Failed to parse offline chapter cache', e);
      }
    }

    try {
      // 2. Try Firestore global library (legacy fallback)
      const chapterData = await this.firestoreRepo.getChapter(versionId, bookId, chapter);
      // Save successfully fetched data to SQLite cache for future offline access
      if (chapterData && chapterData.verses) {
        await saveChapter(versionId, passageId, JSON.stringify(chapterData.verses));
      }
      return chapterData;
    } catch (e) {
      throw new Error(`Failed to fetch chapter ${passageId} from Firestore`);
    }
  }

  async downloadVersion(versionId: string, onProgress?: (progress: number, total: number) => void): Promise<boolean> {
    if (this.activeDownloads.has(String(versionId))) {
      console.log(`[BibleDataService] Download for ${versionId} is already in progress, waiting for it...`);
      return this.activeDownloads.get(String(versionId))!;
    }

    const downloadPromise = this._executeDownloadVersion(versionId, onProgress);
    this.activeDownloads.set(String(versionId), downloadPromise);
    
    try {
      const result = await downloadPromise;
      if (result) {
        DeviceEventEmitter.emit(BIBLE_DOWNLOAD_COMPLETED_EVENT, versionId);
      }
      return result;
    } finally {
      this.activeDownloads.delete(String(versionId));
    }
  }

  private async _executeDownloadVersion(versionId: string, onProgress?: (progress: number, total: number) => void): Promise<boolean> {
    try {
      console.log(`\n[BibleDataService] ===== downloadVersion START versionId="${versionId}" =====`);

      // CLEAR ANY OLD CACHED DATA first!
      await deleteOfflineBible(versionId);
      console.log('[BibleDataService] [STEP 1] Old SQLite cache cleared ✅');

      // Fetch version details and books early
      let versionDetails: any = null;
      try {
        versionDetails = await this.firestoreRepo.getVersionDetails(versionId);
      } catch (err: any) {
        console.warn('[BibleDataService] Could not fetch version details from Firestore:', err?.message);
      }

      // Pre-fetch and cache books for this version so books navigation works offline
      let books = await this.getBooks(versionId);
      if (books && books.length > 0) {
        await saveBibleBooks(versionId, books);
        console.log(`[BibleDataService] Saved ${books.length} books to SQLite ✅`);
      }

      // Try to fetch the full JSON from Cloud Storage if sourceStoragePath is available
      try {
        const downloadUrl = versionDetails?.sourceStoragePath ?? null;
        console.log(`[BibleDataService] [STEP 4] sourceStoragePath = "${downloadUrl}" (${downloadUrl ? 'FOUND ✅' : 'NOT FOUND ❌ - will fall back to Firestore'})`);

        if (downloadUrl) {
          const url = new URL(downloadUrl);
          url.searchParams.append('cacheBust', Date.now().toString());

          console.log('[BibleDataService] [STEP 5] Fetching JSON from Cloud Storage...');
          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const fullBibleJson = await response.json();
          const isArray = Array.isArray(fullBibleJson);
          const topKeys = isArray ? [] : Object.keys(fullBibleJson ?? {});
          console.log(`[BibleDataService] [STEP 7] JSON downloaded ✅ | isArray: ${isArray} | topKeys: [${topKeys.join(', ')}] | hasChapters: ${!!fullBibleJson?.chapters}`);

          // Handle the Python script's _Firebase.json format (object with "chapters" key)
          if (fullBibleJson && fullBibleJson.chapters && typeof fullBibleJson.chapters === 'object') {
            const chaptersArray = Object.values(fullBibleJson.chapters) as any[];
            const totalChapters = chaptersArray.length;
            let downloadedChapters = 0;
            console.log(`[BibleDataService] [STEP 8] OBJECT format detected ✅ | chapters count: ${totalChapters}`);

            if (totalChapters > 0) {
              const BATCH_SIZE = 50;
              for (let i = 0; i < chaptersArray.length; i += BATCH_SIZE) {
                const chunk = chaptersArray.slice(i, i + BATCH_SIZE);
                const batchEntries = chunk
                  .filter((c: any) => c && c.verses)
                  .map((c: any) => ({
                    passageId: `${c.book_id}.${c.chapter}`,
                    content: JSON.stringify(c.verses),
                  }));

                await saveChaptersBatch(versionId, batchEntries);
                downloadedChapters += chunk.length;
                if (onProgress) {
                  onProgress(downloadedChapters, totalChapters);
                }
              }

              // Ensure books metadata is saved
              if (fullBibleJson.index && Array.isArray(fullBibleJson.index.books) && fullBibleJson.index.books.length > 0) {
                books = fullBibleJson.index.books.map((b: any, idx: number) => {
                  const bookId = String(b.id || b.usfm || idx);
                  const chapters = Array.isArray(b.chapters)
                    ? b.chapters.map((c: any, cIdx: number) => {
                        const chNum = extractChapterNumber(c, cIdx);
                        return {
                          id: chNum,
                          human_reference: chNum,
                          passage_id: c?.passage_id || `${bookId}.${chNum}`,
                        };
                      })
                    : undefined;
                  return {
                    id: bookId,
                    usfm: String(b.usfm || b.id || idx),
                    name: b.name || b.human || b.abbreviation || getHumanReadableBookName(b.usfm || b.id),
                    longName: b.long_name || b.longName,
                    abbreviation: b.abbreviation || b.usfm,
                    canon: b.canon || 'other',
                    order: typeof b.order === 'number' ? b.order : idx,
                    chapterCount: Number(b.chapterCount || chapters?.length || 0),
                    chapters,
                  };
                });
                await saveBibleBooks(versionId, books);
              } else if (!books || books.length === 0) {
                const derivedBooksMap = new Map<string, { bookId: string; maxChapter: number }>();
                for (const c of chaptersArray) {
                  const bId = c.book_id;
                  const chNum = parseInt(String(c.chapter), 10) || 1;
                  const current = derivedBooksMap.get(bId) || { bookId: bId, maxChapter: 0 };
                  if (chNum > current.maxChapter) current.maxChapter = chNum;
                  derivedBooksMap.set(bId, current);
                }
                const derivedBooks: BibleBook[] = Array.from(derivedBooksMap.values()).map((b, idx) => ({
                  id: b.bookId,
                  usfm: b.bookId,
                  name: getHumanReadableBookName(b.bookId) || b.bookId,
                  abbreviation: b.bookId,
                  canon: 'other',
                  order: idx,
                  chapterCount: b.maxChapter,
                }));
                await saveBibleBooks(versionId, derivedBooks);
                books = derivedBooks;
              } else {
                await saveBibleBooks(versionId, books);
              }

              await saveTranslationMeta({
                id: versionId,
                abbreviation: versionDetails?.abbreviation,
                title: versionDetails?.title,
                languageTag: versionDetails?.languageTag,
                contentVersion: versionDetails?.contentVersion || 1,
                chapterCount: totalChapters,
              });
              await saveBibleIndex(versionId, { books, totalChapters, downloadedAt: Date.now() });

              console.log('[BibleDataService] ✅ OBJECT path: saved', totalChapters, 'chapters and indices to SQLite');
              return true;
            }
          // Handle array format (array of books with chapters)
          } else if (Array.isArray(fullBibleJson)) {
            let totalChapters = 0;
            let downloadedChapters = 0;

            const extractedBooks: BibleBook[] = [];
            const allChapterEntries: Array<{ passageId: string; content: string }> = [];

            fullBibleJson.forEach((book: any, bIdx: number) => {
              const bookId = book.id || book.abbreviation;
              const chCount = book.chapters?.length || 0;
              totalChapters += chCount;

              extractedBooks.push({
                id: bookId,
                usfm: bookId,
                name: book.name || bookId,
                longName: book.long_name,
                abbreviation: book.abbreviation,
                canon: 'other',
                order: bIdx,
                chapterCount: chCount,
              });

              if (book.chapters) {
                book.chapters.forEach((chData: any, cIdx: number) => {
                  const chapterNum = cIdx + 1;
                  const passageId = `${bookId}.${chapterNum}`;
                  if (chData && chData.verses) {
                    allChapterEntries.push({
                      passageId,
                      content: JSON.stringify(chData.verses),
                    });
                  }
                });
              }
            });

            console.log(`[BibleDataService] [STEP 8] ARRAY format detected ✅ | chapters count: ${totalChapters}`);

            if (totalChapters > 0) {
              await saveBibleBooks(versionId, extractedBooks);

              const BATCH_SIZE = 50;
              for (let i = 0; i < allChapterEntries.length; i += BATCH_SIZE) {
                const chunk = allChapterEntries.slice(i, i + BATCH_SIZE);
                await saveChaptersBatch(versionId, chunk);
                downloadedChapters += chunk.length;
                if (onProgress) {
                  onProgress(downloadedChapters, totalChapters);
                }
              }

              await saveTranslationMeta({
                id: versionId,
                abbreviation: versionDetails?.abbreviation,
                title: versionDetails?.title,
                languageTag: versionDetails?.languageTag,
                contentVersion: versionDetails?.contentVersion || 1,
                chapterCount: totalChapters,
              });
              await saveBibleIndex(versionId, { books: extractedBooks, totalChapters, downloadedAt: Date.now() });

              console.log('[BibleDataService] ✅ ARRAY path: saved', totalChapters, 'chapters and indices to SQLite');
              return true;
            }
          }
        }
      } catch (e: any) {
        console.warn('[BibleDataService] ❌ Exception in Cloud Storage block, falling back to Firestore:', e?.message);
      }

      // Fallback: Download chapter by chapter from Firestore
      console.log('[BibleDataService] [FALLBACK] Starting Firestore chapter-by-chapter download...');
      if (!books || books.length === 0) {
        books = await this.getBooks(versionId);
      }
      if (books && books.length > 0) {
        await saveBibleBooks(versionId, books);
      }

      let totalChapters = 0;
      let downloadedChapters = 0;
      books.forEach((book) => {
        totalChapters += book.chapterCount;
      });

      if (totalChapters === 0) return false;

      const BATCH_SIZE = 10;
      for (const book of books) {
        for (let chapter = 1; chapter <= book.chapterCount; chapter += BATCH_SIZE) {
          const promises = [];
          for (let i = 0; i < BATCH_SIZE && chapter + i <= book.chapterCount; i++) {
            const chNum = chapter + i;
            promises.push(
              this.getChapter(versionId, book.id, chNum)
                .then(() => {
                  downloadedChapters++;
                  if (onProgress) {
                    onProgress(downloadedChapters, totalChapters);
                  }
                })
                .catch((e) => console.warn(`Failed to cache ${book.id} chapter ${chNum}`, e))
            );
          }
          await Promise.all(promises);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      await saveTranslationMeta({
        id: versionId,
        abbreviation: versionDetails?.abbreviation,
        title: versionDetails?.title,
        languageTag: versionDetails?.languageTag,
        contentVersion: versionDetails?.contentVersion || 1,
        chapterCount: totalChapters,
      });
      await saveBibleIndex(versionId, { books, totalChapters, downloadedAt: Date.now() });

      return true;
    } catch (e) {
      console.error('Error downloading version', e);
      return false;
    }
  }

  async getCompareVerses(
    bookId: string,
    chapter: number,
    verseNumbers: string[],
    currentTranslationId?: string | number
  ): Promise<VerseComparisonEntry[]> {
    const passageId = `${bookId}.${chapter}`;

    // 1. Get all chapters stored locally for this passage across translations
    const offlinePassages = await getOfflinePassageForTranslations(passageId);

    // 2. Get saved versions list from AsyncStorage and offline translations meta from SQLite
    const [savedVersions, offlineMetaList] = await Promise.all([
      getSavedVersions().catch(() => []),
      getDownloadedTranslations().catch(() => []),
    ]);

    // Build lookup maps for metadata
    const metaMap = new Map<string, { abbreviation: string; title: string; languageTag?: string }>();
    for (const m of offlineMetaList) {
      metaMap.set(String(m.id), {
        abbreviation: m.abbreviation || m.id,
        title: m.title || m.abbreviation || m.id,
        languageTag: m.languageTag,
      });
    }
    for (const s of savedVersions) {
      const id = String((s as any).id);
      const existing = metaMap.get(id);
      metaMap.set(id, {
        abbreviation: (s as any).local_abbreviation || (s as any).abbreviation || existing?.abbreviation || id,
        title: (s as any).localized_title || (s as any).title || existing?.title || id,
        languageTag: (s as any).language_tag || (s as any).language?.tag || existing?.languageTag,
      });
    }

    // 3. Collect passage content per translation
    const passageMap = new Map<string, string>();
    for (const p of offlinePassages) {
      passageMap.set(String(p.translationId), p.content);
    }

    // If any saved version was not in offlinePassages, also check fetchChapterData
    for (const s of savedVersions) {
      const sId = String((s as any).id);
      if (!passageMap.has(sId)) {
        try {
          const chData = await fetchChapterData(sId, passageId);
          if (chData) {
            passageMap.set(sId, typeof chData === 'string' ? chData : JSON.stringify(chData));
          }
        } catch {}
      }
    }

    if (currentTranslationId && !passageMap.has(String(currentTranslationId))) {
      try {
        const currentCh = await fetchChapterData(String(currentTranslationId), passageId);
        if (currentCh) {
          passageMap.set(String(currentTranslationId), typeof currentCh === 'string' ? currentCh : JSON.stringify(currentCh));
        }
      } catch {}
    }


    const cleanText = (text: any): string => {
      if (!text || typeof text !== 'string') return '';
      return text
        .replace(/\{\{note:\d+\}\}/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/#/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    };

    const requestedSet = new Set(verseNumbers.map(String));
    const results: VerseComparisonEntry[] = [];

    for (const [translationId, contentStr] of passageMap.entries()) {
      try {
        const verses = JSON.parse(contentStr);
        if (!Array.isArray(verses)) continue;

        const matchedVerses: Array<{ verseNumber: string; text: string }> = [];

        for (const v of verses) {
          const vNum = String(v.verseNumber);
          const isExact = requestedSet.has(vNum);
          const isRangeMatch = !isExact && verseNumbers.some((req) => {
            if (vNum.includes('-')) {
              const [start, end] = vNum.split('-').map(Number);
              const r = Number(req);
              return !isNaN(start) && !isNaN(end) && !isNaN(r) && r >= start && r <= end;
            }
            return false;
          });

          if (isExact || isRangeMatch) {
            matchedVerses.push({
              verseNumber: vNum,
              text: cleanText(v.content || ''),
            });
          }
        }

        if (matchedVerses.length > 0) {
          const meta = metaMap.get(translationId) || {
            abbreviation: translationId,
            title: translationId,
          };

          const formattedText = matchedVerses.map((mv) => `${mv.verseNumber} ${mv.text}`).join('\n');

          results.push({
            versionId: translationId,
            abbreviation: meta.abbreviation,
            title: meta.title,
            languageTag: meta.languageTag,
            verses: matchedVerses,
            formattedText,
          });
        }
      } catch (err) {
        console.warn(`[BibleDataService] Error parsing verses for translation ${translationId}:`, err);
      }
    }

    // Sort: Current active translation first, then by savedVersions list order
    const savedOrder = savedVersions.map((s: any) => String(s.id));
    results.sort((a, b) => {
      if (currentTranslationId && String(a.versionId) === String(currentTranslationId)) return -1;
      if (currentTranslationId && String(b.versionId) === String(currentTranslationId)) return 1;

      const idxA = savedOrder.indexOf(String(a.versionId));
      const idxB = savedOrder.indexOf(String(b.versionId));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.abbreviation.localeCompare(b.abbreviation);
    });

    return results;
  }
}


// Export a singleton instance
export const bibleDataService = new BibleDataService();
