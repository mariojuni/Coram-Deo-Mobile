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
import { getChapter, saveChapter } from './offlineDb.repository';

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

  async getChapter(versionId: string, bookId: string, chapter: number): Promise<BibleChapter> {
    const passageId = `${bookId}.${chapter}`;

    // 1. Try to get from SQLite offline cache first (TEMPORARILY DISABLED FOR DEBUGGING HEADINGS)
    /*
    const offlineChapterStr = await getChapter(versionId, passageId);
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
    */

    try {
      // 2. Try Firestore global library
      const chapterData = await this.firestoreRepo.getChapter(versionId, bookId, chapter);
      // Save successfully fetched data to SQLite cache for future offline access
      if (chapterData && chapterData.verses) {
        await saveChapter(versionId, passageId, JSON.stringify(chapterData.verses));
      }
      return chapterData;
    } catch (e) {
      // 3. Fallback to legacy HTML parser
      const legacyVerses = await fetchChapterData(versionId, passageId);
      if (legacyVerses) {
        return {
          versionId: String(versionId),
          bookId,
          chapterNumber: chapter,
          verses: legacyVerses.map((v: any) => ({
            id: v.id,
            verseNumber: v.verseNumber,
            heading: v.heading,
            content: v.content,
          }))
        };
      }
      throw new Error(`Failed to fetch chapter fallback for ${passageId}`);
    }
  }

  async downloadVersion(versionId: string, onProgress?: (progress: number, total: number) => void): Promise<boolean> {
    try {
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
