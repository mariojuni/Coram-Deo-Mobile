import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  increment,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { db, storage } from '@/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import type {
  Sermon,
  SermonNote,
  SermonDownload,
  SermonFilters,
  SermonPlaybackProgress,
} from '../domain/sermon.types';

const SERMONS_COLLECTION = 'sermons';
const NOTES_COLLECTION = 'sermon_notes';
const PROGRESS_COLLECTION = 'sermon_progress';
const FAVORITES_COLLECTION = 'sermon_favorites';
const DOWNLOADS_COLLECTION = 'sermon_downloads';

class SermonRepository {
  /**
   * Resolves a raw Firebase Storage path to a playable download URL.
   * If the URL is already an HTTP or local file path, it returns it as is.
   */
  async resolveMediaUrl(pathOrUrl: string): Promise<string> {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('file://') || pathOrUrl.startsWith('content://')) {
      return pathOrUrl;
    }
    try {
      const storageRef = ref(storage, pathOrUrl);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.warn('Failed to resolve media URL:', error);
      return pathOrUrl;
    }
  }

  // Fetch paginated sermons
  async fetchSermons(
    filters: SermonFilters,
    pageSize = 20,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ) {
    const sermonsRef = collection(db, SERMONS_COLLECTION);
    let q = query(
      sermonsRef,
      where('status', '==', 'published')
    );

    // Strictly enforce churchId
    if (filters.churchId) {
      q = query(q, where('churchId', '==', filters.churchId));
    } else {
      // Do not query if churchId is null
      return { sermons: [], lastDoc: undefined, hasMore: false };
    }

    // Apply type filter
    if (filters.filter === 'video') {
      q = query(q, where('type', '==', 'video'));
    } else if (filters.filter === 'audio') {
      q = query(q, where('type', '==', 'audio'));
    } else if (filters.seriesId) {
      q = query(q, where('seriesId', '==', filters.seriesId));
    }

    // Apply sort
    q = query(
      q,
      orderBy(this.getSortField(filters.sort), filters.sort === 'oldest' ? 'asc' : 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const sermons = snapshot.docs.map((doc) => this.mapDocToSermon(doc));

    return {
      sermons,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize,
    };
  }

  // Search sermons
  async searchSermons(
    searchQuery: string,
    filters: SermonFilters,
    pageSize = 20
  ) {
    const sermonsRef = collection(db, SERMONS_COLLECTION);
    
    // For simple search, we'll fetch all published sermons and filter client-side
    // In production, you'd use Algolia or similar for better search
    // Strictly enforce churchId
    if (!filters.churchId) {
      return { sermons: [], hasMore: false };
    }

    let q = query(
      sermonsRef,
      where('status', '==', 'published'),
      where('churchId', '==', filters.churchId),
      orderBy(this.getSortField(filters.sort), filters.sort === 'oldest' ? 'asc' : 'desc'),
      limit(100) // Fetch more for client-side filtering
    );

    // Apply type filter
    if (filters.filter === 'video') {
      q = query(sermonsRef, where('mediaType', 'in', ['video', 'both']), where('status', '==', 'published'));
    } else if (filters.filter === 'audio') {
      q = query(sermonsRef, where('mediaType', 'in', ['audio', 'both']), where('status', '==', 'published'));
    }

    const snapshot = await getDocs(q);
    let sermons = snapshot.docs.map((doc) => this.mapDocToSermon(doc));

    // Client-side search filter
    const lowerQuery = searchQuery.toLowerCase();
    sermons = sermons.filter((sermon) => {
      return (
        sermon.title?.toLowerCase().includes(lowerQuery) ||
        sermon.description?.toLowerCase().includes(lowerQuery) ||
        sermon.preacherName?.toLowerCase().includes(lowerQuery) ||
        sermon.seriesTitle?.toLowerCase().includes(lowerQuery)
      );
    });

    // Limit results
    sermons = sermons.slice(0, pageSize);

    return {
      sermons,
      hasMore: false, // Simplified for client-side search
    };
  }

  async fetchSermonById(id: string): Promise<Sermon | null> {
    const docRef = doc(db, SERMONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? this.mapDocToSermon(docSnap) : null;
  }

  // Increment view count
  async incrementViewCount(sermonId: string) {
    const sermonRef = doc(db, SERMONS_COLLECTION, sermonId);
    await updateDoc(sermonRef, {
      viewCount: increment(1),
    });
  }

  // Favorites
  async toggleFavorite(userId: string, sermonId: string): Promise<boolean> {
    const favId = `${userId}_${sermonId}`;
    const favRef = doc(db, FAVORITES_COLLECTION, favId);
    const favSnap = await getDoc(favRef);

    if (favSnap.exists()) {
      await deleteDoc(favRef);
      // Decrement favorite count on sermon
      const sermonRef = doc(db, SERMONS_COLLECTION, sermonId);
      await updateDoc(sermonRef, {
        favoriteCount: increment(-1),
      });
      return false;
    } else {
      await setDoc(favRef, {
        userId,
        sermonId,
        createdAt: Timestamp.now(),
      });
      // Increment favorite count on sermon
      const sermonRef = doc(db, SERMONS_COLLECTION, sermonId);
      await updateDoc(sermonRef, {
        favoriteCount: increment(1),
      });
      return true;
    }
  }

  async fetchFavorites(userId: string): Promise<Sermon[]> {
    const favsQuery = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(favsQuery);
    const sermonIds = snapshot.docs.map((doc) => doc.data().sermonId);

    // Fetch sermon details
    const sermons = await Promise.all(
      sermonIds.map((id) => this.fetchSermonById(id))
    );
    return sermons.filter((s) => s !== null) as Sermon[];
  }

  async isFavorited(userId: string, sermonId: string): Promise<boolean> {
    const favId = `${userId}_${sermonId}`;
    const favRef = doc(db, FAVORITES_COLLECTION, favId);
    const favSnap = await getDoc(favRef);
    return favSnap.exists();
  }

  // Progress tracking
  async saveProgress(
    churchId: string,
    userId: string,
    sermonId: string,
    mediaType: 'audio' | 'video',
    positionSeconds: number,
    durationSeconds: number
  ) {
    const progressId = `${userId}_${sermonId}`;
    const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
    const progressPercent = durationSeconds > 0 ? (positionSeconds / durationSeconds) * 100 : 0;
    const completed = progressPercent >= 95;

    await setDoc(progressRef, {
      id: progressId,
      churchId,
      userId,
      sermonId,
      mediaType,
      positionSeconds,
      durationSeconds,
      progressPercent,
      completed,
      lastPlayedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  async fetchProgress(userId: string, sermonId: string): Promise<SermonPlaybackProgress | null> {
    const progressId = `${userId}_${sermonId}`;
    const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
    const snap = await getDoc(progressRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      churchId: data.churchId || '',
      userId: data.userId || userId,
      sermonId: data.sermonId || sermonId,
      mediaType: data.mediaType || 'audio',
      positionSeconds: data.positionSeconds ?? data.position ?? 0,
      durationSeconds: data.durationSeconds ?? 0,
      progressPercent: data.progressPercent ?? 0,
      completed: data.completed ?? false,
      lastPlayedAt: data.lastPlayedAt?.toDate?.() ?? new Date(),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  }

  async fetchAllProgresses(userId: string): Promise<SermonPlaybackProgress[]> {
    const q = query(
      collection(db, PROGRESS_COLLECTION),
      where('userId', '==', userId),
      orderBy('lastPlayedAt', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        churchId: data.churchId || '',
        userId: data.userId || userId,
        sermonId: data.sermonId || '',
        mediaType: data.mediaType || 'audio',
        positionSeconds: data.positionSeconds ?? data.position ?? 0,
        durationSeconds: data.durationSeconds ?? 0,
        progressPercent: data.progressPercent ?? 0,
        completed: data.completed ?? false,
        lastPlayedAt: data.lastPlayedAt?.toDate?.() ?? new Date(),
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      };
    });
  }

  async fetchRelatedSermons(sermon: Sermon, maxResults = 6): Promise<Sermon[]> {
    const sermonsRef = collection(db, SERMONS_COLLECTION);
    const results: Sermon[] = [];
    const seenIds = new Set<string>([sermon.id]);

    // 1. Same series
    if (sermon.seriesId) {
      const seriesQuery = query(
        sermonsRef,
        where('churchId', '==', sermon.churchId),
        where('status', '==', 'published'),
        where('seriesId', '==', sermon.seriesId),
        limit(maxResults)
      );
      const snap = await getDocs(seriesQuery);
      snap.docs.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          results.push(this.mapDocToSermon(doc));
          seenIds.add(doc.id);
        }
      });
    }

    // 2. Same preacher
    if (results.length < maxResults && sermon.preacherId) {
      const preacherQuery = query(
        sermonsRef,
        where('churchId', '==', sermon.churchId),
        where('status', '==', 'published'),
        where('preacherId', '==', sermon.preacherId),
        limit(maxResults)
      );
      const snap = await getDocs(preacherQuery);
      snap.docs.forEach((doc) => {
        if (!seenIds.has(doc.id) && results.length < maxResults) {
          results.push(this.mapDocToSermon(doc));
          seenIds.add(doc.id);
        }
      });
    }

    // 3. Recent sermons as fallback
    if (results.length < maxResults) {
      const recentQuery = query(
        sermonsRef,
        where('churchId', '==', sermon.churchId),
        where('status', '==', 'published'),
        orderBy('sermonDate', 'desc'),
        limit(maxResults + 1)
      );
      const snap = await getDocs(recentQuery);
      snap.docs.forEach((doc) => {
        if (!seenIds.has(doc.id) && results.length < maxResults) {
          results.push(this.mapDocToSermon(doc));
          seenIds.add(doc.id);
        }
      });
    }

    return results.slice(0, maxResults);
  }

  // Notes
  async saveNote(note: Omit<SermonNote, 'id' | 'createdAt' | 'updatedAt'>) {
    await addDoc(collection(db, NOTES_COLLECTION), {
      ...note,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async updateNote(noteId: string, content: string) {
    const noteRef = doc(db, NOTES_COLLECTION, noteId);
    await updateDoc(noteRef, {
      content,
      updatedAt: Timestamp.now(),
    });
  }

  async deleteNote(noteId: string) {
    const noteRef = doc(db, NOTES_COLLECTION, noteId);
    await deleteDoc(noteRef);
  }

  async fetchNotes(userId: string, sermonId: string): Promise<SermonNote[]> {
    const notesQuery = query(
      collection(db, NOTES_COLLECTION),
      where('userId', '==', userId),
      where('sermonId', '==', sermonId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(notesQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as SermonNote));
  }

  // Download sermons
  async downloadSermon(
    userId: string,
    sermon: Sermon,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Note: We'll need to fetch the actual download URL from Firebase Storage
    // using the storage path in Phase 4.
    const mediaUrl = sermon.mediaType === 'video' ? sermon.videoStoragePath : sermon.audioStoragePath;
    if (!mediaUrl) {
      throw new Error('No media path available');
    }

    const fileName = `sermon_${sermon.id}_${sermon.mediaType}.${sermon.mediaType === 'video' ? 'mp4' : 'm4a'}`;
    const fileUri = `${(FileSystem as any).documentDirectory}sermons/${fileName}`;

    // Create directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(`${(FileSystem as any).documentDirectory}sermons/`);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(`${(FileSystem as any).documentDirectory}sermons/`, { intermediates: true });
    }

    // Download with progress tracking
    const downloadResumable = FileSystem.createDownloadResumable(
      mediaUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(progress);
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) {
      throw new Error('Download failed');
    }

    // Save download record to Firestore
    const downloadRef = doc(db, DOWNLOADS_COLLECTION, `${userId}_${sermon.id}`);
    await setDoc(downloadRef, {
      userId,
      sermonId: sermon.id,
      fileUri: result.uri,
      downloadedAt: Timestamp.now(),
      size: await this.getFileSize(result.uri),
    });

    return result.uri;
  }

  async getDownloadedSermons(userId: string): Promise<SermonDownload[]> {
    const downloadsRef = collection(db, DOWNLOADS_COLLECTION);
    const q = query(downloadsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      downloadedAt: doc.data().downloadedAt?.toDate(),
    } as unknown as SermonDownload));
  }

  async deleteDownload(userId: string, sermonId: string): Promise<void> {
    const downloadRef = doc(db, DOWNLOADS_COLLECTION, `${userId}_${sermonId}`);
    const downloadDoc = await getDoc(downloadRef);

    if (downloadDoc.exists()) {
      const data = downloadDoc.data();
      
      // Delete file from device
      const fileInfo = await FileSystem.getInfoAsync(data.fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(data.fileUri);
      }

      // Delete Firestore record
      await deleteDoc(downloadRef);
    }
  }

  async checkIfDownloaded(userId: string, sermonId: string): Promise<boolean> {
    const downloadRef = doc(db, DOWNLOADS_COLLECTION, `${userId}_${sermonId}`);
    const downloadDoc = await getDoc(downloadRef);
    
    if (!downloadDoc.exists()) {
      return false;
    }

    // Check if file still exists on device
    const data = downloadDoc.data();
    const fileInfo = await FileSystem.getInfoAsync(data.fileUri);
    return fileInfo.exists;
  }

  async getDownloadUri(userId: string, sermonId: string): Promise<string | null> {
    const downloadRef = doc(db, DOWNLOADS_COLLECTION, `${userId}_${sermonId}`);
    const downloadDoc = await getDoc(downloadRef);
    
    if (!downloadDoc.exists()) {
      return null;
    }

    const data = downloadDoc.data();
    const fileInfo = await FileSystem.getInfoAsync(data.fileUri);
    
    return fileInfo.exists ? data.fileUri : null;
  }

  private async getFileSize(uri: string): Promise<number> {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists ? (fileInfo.size || 0) : 0;
  }

  // 

  // Helper methods
  private getSortField(sort: string): string {
    switch (sort) {
      case 'newest':
      case 'oldest':
        return 'sermonDate';
      case 'popular':
        return 'viewCount';
      case 'alphabetical':
        return 'title';
      default:
        return 'sermonDate';
    }
  }

  private mapDocToSermon(doc: QueryDocumentSnapshot<DocumentData>): Sermon {
    const data = doc.data();
    
    const parseDate = (val: any) => {
      if (!val) return undefined;
      if (typeof val.toDate === 'function') return val.toDate();
      if (typeof val === 'string' || typeof val === 'number') return new Date(val);
      return new Date(val); // fallback
    };

    return {
      id: doc.id,
      ...data,
      sermonDate: parseDate(data.sermonDate) || parseDate(data.date),
      createdAt: parseDate(data.createdAt),
      updatedAt: parseDate(data.updatedAt),
      publishedAt: parseDate(data.publishedAt),
    } as Sermon;
  }
}

export const sermonRepository = new SermonRepository();
