import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import { 
  BibleRepository, 
  BibleLanguage, 
  BibleVersionSummary, 
  BibleVersionDetails, 
  BibleBook, 
  BibleChapter 
} from '../domain/BibleRepository';

export class FirestoreBibleRepository implements BibleRepository {
  async getLanguages(): Promise<BibleLanguage[]> {
    try {
      const q = query(collection(getActiveDb(), 'bibleLanguages'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BibleLanguage[];
    } catch (e) {
      console.warn("Error fetching languages from Firestore:", e);
      return [];
    }
  }

  async getVersions(languageTag?: string): Promise<BibleVersionSummary[]> {
    try {
      let q = collection(getActiveDb(), 'bibleVersions');
      let conditions = [where('status', '==', 'published')];
      
      if (languageTag) {
        conditions.push(where('languageTag', '==', languageTag));
      }
      
      const qFinal = query(q, ...conditions);
      const snapshot = await getDocs(qFinal);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id || doc.id,
          translationId: data.translationId || doc.id,
          abbreviation: data.abbreviation || '',
          localAbbreviation: data.localAbbreviation || '',
          title: data.title || '',
          localTitle: data.localTitle || '',
          languageTag: data.languageTag || 'en',
          publisher: data.publisher,
          capabilities: data.capabilities,
          sizeBytes: data.sizeBytes
        } as BibleVersionSummary;
      });
    } catch (e) {
      console.warn("Error fetching versions from Firestore:", e);
      return [];
    }
  }

  async getVersionDetails(versionId: string): Promise<BibleVersionDetails> {
    try {
      const docRef = doc(getActiveDb(), 'bibleVersions', String(versionId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as BibleVersionDetails;
      }
      throw new Error(`Version ${versionId} not found in global library`);
    } catch (e) {
      console.warn(`Error fetching version details for ${versionId}:`, e);
      throw e;
    }
  }

  async getBooks(versionId: string): Promise<BibleBook[]> {
    try {
      const booksRef = collection(getActiveDb(), 'bibleVersions', String(versionId), 'books');
      const q = query(booksRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data()
      })) as BibleBook[];
    } catch (e) {
      console.warn(`Error fetching books for ${versionId}:`, e);
      throw e;
    }
  }

  async getChapter(versionId: string, bookId: string, chapter: number): Promise<BibleChapter> {
    try {
      const chapterRef = doc(getActiveDb(), 'bibleVersions', String(versionId), 'books', String(bookId), 'chapters', String(chapter));
      const docSnap = await getDoc(chapterRef);
      if (docSnap.exists()) {
        return docSnap.data() as BibleChapter;
      }
      throw new Error(`Chapter ${bookId} ${chapter} not found`);
    } catch (e) {
      console.warn(`Error fetching chapter ${bookId} ${chapter} for ${versionId}:`, e);
      throw e;
    }
  }
}
