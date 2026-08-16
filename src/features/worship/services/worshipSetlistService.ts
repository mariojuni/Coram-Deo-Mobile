import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { getActiveDb } from '../../../firebase';
import type { Song, SongVersion, WorshipSetlist, WorshipSetlistItem } from '../domain/worship.types';
import type { UserAccount } from '../../auth/domain/auth.types';
import type { Ministry } from '../../ministry/domain/ministry.types';
import { canViewMobileWorshipSetlist } from '../../../permissions/mobileWorshipPermissions';

export const worshipSetlistService = {
  /**
   * Fetches setlists for the active churchId and filters according to the user's permissions.
   */
  getUpcomingWorshipSetlistsForUser: async (
    user: UserAccount | null | undefined,
    userMinistries?: Ministry[]
  ): Promise<WorshipSetlist[]> => {
    if (!user?.churchId) return [];

    const q = query(
      collection(getActiveDb(), 'worshipSetlists'),
      where('churchId', '==', user.churchId)
    );
    const snapshot = await getDocs(q);
    const allSetlists = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as WorshipSetlist)
    );

    // Filter setlists that user is authorized to view
    const allowed = allSetlists.filter((setlist) =>
      canViewMobileWorshipSetlist(user, setlist, userMinistries)
    );

    // Sort by serviceDate descending
    return allowed.sort((a, b) => {
      const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
      const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
      return dateB - dateA;
    });
  },

  /**
   * Fetches a single setlist by ID with churchId check.
   */
  getWorshipSetlistById: async (
    churchId: string | null | undefined,
    setlistId: string
  ): Promise<WorshipSetlist | null> => {
    if (!churchId || !setlistId) return null;
    const docRef = doc(getActiveDb(), 'worshipSetlists', setlistId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = { id: snap.id, ...snap.data() } as WorshipSetlist;
    if (data.churchId !== churchId) return null;
    return data;
  },

  /**
   * Fetches a setlist by eventId with churchId check.
   */
  getWorshipSetlistByEventId: async (
    churchId: string | null | undefined,
    eventId: string
  ): Promise<WorshipSetlist | null> => {
    if (!churchId || !eventId) return null;
    const q = query(
      collection(getActiveDb(), 'worshipSetlists'),
      where('churchId', '==', churchId),
      where('eventId', '==', eventId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WorshipSetlist;
  },

  /**
   * Fetches setlist items ordered by order, enriched with song data.
   */
  getWorshipSetlistItems: async (
    churchId: string | null | undefined,
    setlistId: string
  ): Promise<WorshipSetlistItem[]> => {
    if (!churchId || !setlistId) return [];
    const q = query(
      collection(getActiveDb(), 'worshipSetlistItems'),
      where('churchId', '==', churchId),
      where('setlistId', '==', setlistId),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as WorshipSetlistItem)
    );

    const enriched = await Promise.all(
      items.map(async (item) => {
        if (item.songId) {
          const songDocRef = doc(getActiveDb(), 'songs', item.songId);
          const songDoc = await getDoc(songDocRef);
          if (songDoc.exists()) {
            item.song = { id: songDoc.id, ...songDoc.data() } as Song;
          }
        }
        return item;
      })
    );

    return enriched;
  },

  /**
   * Fetches a song by ID.
   */
  getSongById: async (songId: string): Promise<Song | null> => {
    if (!songId) return null;
    const docRef = doc(getActiveDb(), 'songs', songId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Song;
  },

  /**
   * Fetches a song version by ID.
   */
  getSongVersionById: async (songVersionId: string): Promise<SongVersion | null> => {
    if (!songVersionId) return null;
    const docRef = doc(getActiveDb(), 'songVersions', songVersionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as SongVersion;
  },

  /**
   * Fetches all songs for a church.
   */
  getAllSongs: async (churchId: string): Promise<Song[]> => {
    if (!churchId) return [];
    const q = query(
      collection(getActiveDb(), 'songs'),
      where('churchId', '==', churchId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Song));
  },

  /**
   * Creates a new worship setlist.
   */
  createWorshipSetlist: async (data: Omit<WorshipSetlist, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(getActiveDb(), 'worshipSetlists'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  },

  /**
   * Updates an existing worship setlist.
   */
  updateWorshipSetlist: async (setlistId: string, data: Partial<WorshipSetlist>): Promise<void> => {
    const docRef = doc(getActiveDb(), 'worshipSetlists', setlistId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Deletes a worship setlist and its items.
   */
  deleteWorshipSetlist: async (setlistId: string): Promise<void> => {
    const batch = writeBatch(getActiveDb());

    const setlistRef = doc(getActiveDb(), 'worshipSetlists', setlistId);
    batch.delete(setlistRef);

    const itemsQuery = query(
      collection(getActiveDb(), 'worshipSetlistItems'),
      where('setlistId', '==', setlistId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    itemsSnapshot.docs.forEach((itemDoc) => {
      batch.delete(itemDoc.ref);
    });

    await batch.commit();
  },

  /**
   * Creates a setlist item (song in setlist).
   */
  createWorshipSetlistItem: async (itemData: Omit<WorshipSetlistItem, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(getActiveDb(), 'worshipSetlistItems'), {
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  },

  /**
   * Updates a setlist item.
   */
  updateWorshipSetlistItem: async (itemId: string, itemData: Partial<WorshipSetlistItem>): Promise<void> => {
    const docRef = doc(getActiveDb(), 'worshipSetlistItems', itemId);
    await updateDoc(docRef, {
      ...itemData,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Deletes a setlist item.
   */
  deleteWorshipSetlistItem: async (itemId: string): Promise<void> => {
    const docRef = doc(getActiveDb(), 'worshipSetlistItems', itemId);
    await deleteDoc(docRef);
  },
};

