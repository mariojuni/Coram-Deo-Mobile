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
import { db } from '@/firebase';
import type {
  Sermon,
  SermonNote,
  SermonDownload,
  SermonFilters,
} from '../domain/sermon.types';

const SERMONS_COLLECTION = 'sermons';
const NOTES_COLLECTION = 'sermon_notes';
const PROGRESS_COLLECTION = 'sermon_progress';
const FAVORITES_COLLECTION = 'sermon_favorites';
const DOWNLOADS_COLLECTION = 'sermon_downloads';

class SermonRepository {
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
    const sermons = snapshot.docs.map(this.mapDocToSermon);

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
    let q = query(
      sermonsRef,
      where('status', '==', 'published'),
      orderBy(this.getSortField(filters.sort), filters.sort === 'oldest' ? 'asc' : 'desc'),
      limit(100) // Fetch more for client-side filtering
    );

    // Apply type filter
    if (filters.filter === 'video') {
      q = query(sermonsRef, where('type', '==', 'video'), where('status', '==', 'published'));
    } else if (filters.filter === 'audio') {
      q = query(sermonsRef, where('type', '==', 'audio'), where('status', '==', 'published'));
    }

    const snapshot = await getDocs(q);
    let sermons = snapshot.docs.map(this.mapDocToSermon);

    // Client-side search filter
    const lowerQuery = searchQuery.toLowerCase();
    sermons = sermons.filter((sermon) => {
      return (
        sermon.title?.toLowerCase().includes(lowerQuery) ||
        sermon.description?.toLowerCase().includes(lowerQuery) ||
        sermon.speaker?.name?.toLowerCase().includes(lowerQuery) ||
        sermon.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        sermon.series?.title?.toLowerCase().includes(lowerQuery)
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
  async saveProgress(userId: string, sermonId: string, position: number) {
    const progressId = `${userId}_${sermonId}`;
    const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
    
    await setDoc(progressRef, {
      userId,
      sermonId,
      position,
      lastWatchedAt: Timestamp.now(),
      completed: false,
    }, { merge: true });
  }

  async fetchProgress(userId: string, sermonId: string): Promise<number> {
    const progressId = `${userId}_${sermonId}`;
    const progressRef = doc(db, PROGRESS_COLLECTION, progressId);
    const progressSnap = await getDoc(progressRef);
    return progressSnap.exists() ? progressSnap.data().position : 0;
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
    const mediaUrl = sermon.type === 'video' ? sermon.videoUrl : sermon.audioUrl;
    if (!mediaUrl) {
      throw new Error('No media URL available');
    }

    const fileName = `sermon_${sermon.id}_${sermon.type}.${sermon.type === 'video' ? 'mp4' : 'm4a'}`;
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
        return 'date';
      case 'popular':
        return 'viewCount';
      case 'alphabetical':
        return 'title';
      default:
        return 'date';
    }
  }

  private mapDocToSermon(doc: QueryDocumentSnapshot<DocumentData>): Sermon {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      publishedAt: data.publishedAt?.toDate(),
      series: data.series ? {
        ...data.series,
        startDate: data.series.startDate?.toDate(),
        endDate: data.series.endDate?.toDate(),
      } : undefined,
    } as Sermon;
  }
}

export const sermonRepository = new SermonRepository();
