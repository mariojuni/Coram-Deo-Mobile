import { DeviceEventEmitter } from 'react-native';
export const BIBLE_DOWNLOAD_COMPLETED_EVENT = 'BIBLE_DOWNLOAD_COMPLETED';

import { FirestoreBibleRepository } from './FirestoreBibleRepository';
import { 
  BibleRepository, 
  BibleLanguage, 
  BibleVersionSummary, 
  BibleVersionDetails, 
  BibleBook, 
  BibleChapter 
} from '../domain/BibleRepository';
import { fetchLanguages, fetchBiblesByLanguage, fetchBibleIndex, fetchChapterData, getChapterFromCache, getSavedVersions, saveVersion, removeVersion, downloadBibleOffline, getUserPreferences, saveUserPreferences, fetchOrganization } from './bible.repository';
import { getChapter, saveChapter, deleteOfflineBible } from './offlineDb.repository';

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
    try {
      const globalBooks = await this.firestoreRepo.getBooks(versionId);
      if (globalBooks.length > 0) return globalBooks;
    } catch (e) {
      // ignore and fallback
    }

    const legacyIndex = await fetchBibleIndex(versionId);
    if (legacyIndex && legacyIndex.books) {
      return legacyIndex.books.map((b: any, index: number) => ({
        id: b.usfm,
        usfm: b.usfm,
        name: b.name || b.human,
        longName: b.long_name,
        abbreviation: b.abbreviation,
        canon: 'other',
        order: index,
        chapterCount: b.chapters?.length || 0,
        chapters: b.chapters
      }));
    }
    return [];
  }

  private activeDownloads: Map<string, Promise<boolean>> = new Map();

  async getChapter(versionId: string, bookId: string, chapter: number): Promise<BibleChapter> {
    const passageId = `${bookId}.${chapter}`;

    // 1. Try to get from SQLite offline cache first
    let offlineChapterStr = await getChapter(versionId, passageId);

    // If it's currently downloading but we don't have it locally yet,
    // we just fall through to fetch from Firestore immediately so the UI doesn't block.

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

      // Try to fetch the full JSON from Cloud Storage if sourceStoragePath is available
      try {
        console.log(`[BibleDataService] [STEP 2] Calling getVersionDetails for "${versionId}" from bibleVersions collection...`);
        
        let versionDetails: any = null;
        let detailsError: any = null;
        try {
          versionDetails = await this.firestoreRepo.getVersionDetails(versionId);
          console.log('[BibleDataService] [STEP 3] getVersionDetails SUCCESS ✅');
          console.log('[BibleDataService] [STEP 3] Full versionDetails:', JSON.stringify(versionDetails));
        } catch (err: any) {
          detailsError = err;
          console.warn('[BibleDataService] [STEP 3] getVersionDetails FAILED ❌');
          console.warn('[BibleDataService] [STEP 3] Error message:', err?.message);
          console.warn('[BibleDataService] [STEP 3] Error code:', err?.code);
        }

        const downloadUrl = versionDetails?.sourceStoragePath ?? null;
        console.log(`[BibleDataService] [STEP 4] sourceStoragePath = "${downloadUrl}" (${downloadUrl ? 'FOUND ✅' : 'NOT FOUND ❌ - will fall back to Firestore'})`);

        if (downloadUrl) {
          // Append cache-buster to prevent Firebase CDN from serving the old file
          const url = new URL(downloadUrl);
          url.searchParams.append('cacheBust', Date.now().toString());

          console.log('[BibleDataService] [STEP 5] Fetching JSON from Cloud Storage...');
          const response = await fetch(url.toString());
          console.log(`[BibleDataService] [STEP 6] HTTP response: ${response.status} ${response.ok ? '✅ OK' : '❌ FAILED'}`);
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
              for (const chapterData of chaptersArray) {
                const bookId = chapterData.book_id;
                const chapterNum = chapterData.chapter;
                const passageId = `${bookId}.${chapterNum}`;

                if (chapterData.verses) {
                  await saveChapter(versionId, passageId, JSON.stringify(chapterData.verses));
                }
                downloadedChapters++;
                if (onProgress) {
                  onProgress(downloadedChapters, totalChapters);
                }
              }
              console.log('[BibleDataService] ✅ OBJECT path: saved', totalChapters, 'chapters to SQLite');
              return true;
            }
          // Handle array format (array of books with chapters)
          } else if (Array.isArray(fullBibleJson)) {
            let totalChapters = 0;
            let downloadedChapters = 0;

            fullBibleJson.forEach((book: any) => {
              totalChapters += book.chapters?.length || 0;
            });
            console.log(`[BibleDataService] [STEP 8] ARRAY format detected ✅ | chapters count: ${totalChapters}`);

            if (totalChapters > 0) {
              for (const book of fullBibleJson) {
                const bookId = book.id || book.abbreviation;
                if (!book.chapters) continue;

                for (let i = 0; i < book.chapters.length; i++) {
                  const chapterNum = i + 1;
                  const chapterData = book.chapters[i];
                  const passageId = `${bookId}.${chapterNum}`;

                  if (chapterData && chapterData.verses) {
                    await saveChapter(versionId, passageId, JSON.stringify(chapterData.verses));
                  }
                  downloadedChapters++;
                  if (onProgress) {
                    onProgress(downloadedChapters, totalChapters);
                  }
                }
              }
              console.log('[BibleDataService] ✅ ARRAY path: saved', totalChapters, 'chapters to SQLite');
              return true;
            }
          } else {
            console.error('[BibleDataService] [STEP 8] ❌ JSON format not recognized! Keys found:', topKeys);
          }
        } else {
          console.warn('[BibleDataService] [STEP 5] ⚠️ Skipping Cloud Storage (no sourceStoragePath). Reason:', detailsError ? `getVersionDetails threw: ${detailsError.message}` : 'field is null/undefined in Firestore doc');
        }
      } catch (e: any) {
        console.warn('[BibleDataService] ❌ EXCEPTION in Cloud Storage block:', e?.message, '| code:', e?.code);
        console.warn('[BibleDataService] Falling back to Firestore chapter-by-chapter...');
      }

      // Fallback: Download chapter by chapter from Firestore
      console.log('[BibleDataService] [FALLBACK] Starting Firestore chapter-by-chapter download...');
      const books = await this.getBooks(versionId);
      let totalChapters = 0;
      let downloadedChapters = 0;

      books.forEach(book => {
        totalChapters += book.chapterCount;
      });

      if (totalChapters === 0) return false;

      // We will batch chapter requests to not overwhelm Firestore
      const BATCH_SIZE = 10;
      for (const book of books) {
        for (let chapter = 1; chapter <= book.chapterCount; chapter += BATCH_SIZE) {
          const promises = [];
          for (let i = 0; i < BATCH_SIZE && (chapter + i) <= book.chapterCount; i++) {
            promises.push(
              this.getChapter(versionId, book.id, chapter + i).then(() => {
                downloadedChapters++;
                if (onProgress) {
                  onProgress(downloadedChapters, totalChapters);
                }
              }).catch(e => console.warn(`Failed to cache ${book.id} chapter ${chapter + i}`, e))
            );
          }
          await Promise.all(promises);
          // Optional slight delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return true;
    } catch (e) {
      console.error('Error downloading version', e);
      return false;
    }
  }
}

// Export a singleton instance
export const bibleDataService = new BibleDataService();
