import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Song, WorshipSetlist, WorshipSetlistItem } from '../domain/worship.types';

export const worshipRepository = {
  getSongs: async (churchId: string): Promise<Song[]> => {
    const q = query(collection(db, 'songs'), where('churchId', '==', churchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Song));
  },

  getSetlists: async (churchId: string): Promise<WorshipSetlist[]> => {
    const q = query(collection(db, 'worshipSetlists'), where('churchId', '==', churchId));
    const snapshot = await getDocs(q);
    const setlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorshipSetlist));
    return setlists.sort((a, b) => {
      const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
      const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
      return dateB - dateA;
    });
  },

  subscribeToSetlists: (churchId: string, onUpdate: (setlists: WorshipSetlist[]) => void, onError: (error: Error) => void) => {
    const q = query(collection(db, 'worshipSetlists'), where('churchId', '==', churchId));
    return onSnapshot(
      q,
      (snapshot) => {
        const setlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorshipSetlist));
        setlists.sort((a, b) => {
          const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
          const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
          return dateB - dateA;
        });
        onUpdate(setlists);
      },
      onError
    );
  },

  updateSetlistItem: async (itemId: string, data: Partial<WorshipSetlistItem>): Promise<void> => {
    const ref = doc(db, 'worshipSetlistItems', itemId);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  getSetlistItem: async (itemId: string): Promise<WorshipSetlistItem | null> => {
    const docRef = doc(db, 'worshipSetlistItems', itemId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as WorshipSetlistItem;
  },

  getSong: async (songId: string): Promise<Song | null> => {
    const docRef = doc(db, 'songs', songId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Song;
  },

  getPublishedSetlistForEvent: async (churchId: string, eventId: string): Promise<WorshipSetlist | null> => {
    const q = query(
      collection(db, 'worshipSetlists'),
      where('churchId', '==', churchId),
      where('eventId', '==', eventId),
      where('status', '==', 'published'),
      limit(1)
    );
    const snapshot = await getDocs(q);
      
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WorshipSetlist;
  },

  getSetlistForEvent: async (churchId: string, eventId: string): Promise<WorshipSetlist | null> => {
    const q = query(
      collection(db, 'worshipSetlists'),
      where('churchId', '==', churchId),
      where('eventId', '==', eventId),
      limit(1)
    );
    const snapshot = await getDocs(q);
      
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WorshipSetlist;
  },

  subscribeToSetlistForEvent: (churchId: string, eventId: string, onUpdate: (setlist: WorshipSetlist | null) => void, onError: (error: Error) => void) => {
    const q = query(
      collection(db, 'worshipSetlists'),
      where('churchId', '==', churchId),
      where('eventId', '==', eventId),
      limit(1)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(null);
        } else {
          onUpdate({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as WorshipSetlist);
        }
      },
      onError
    );
  },

  getSetlistItems: async (setlistId: string): Promise<WorshipSetlistItem[]> => {
    const q = query(
      collection(db, 'worshipSetlistItems'),
      where('setlistId', '==', setlistId),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
      
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSetlistItem));
    
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const songDocRef = doc(db, 'songs', item.songId);
      const songDoc = await getDoc(songDocRef);
      if (songDoc.exists()) {
        item.song = { id: songDoc.id, ...songDoc.data() } as Song;
      }
      return item;
    }));
    
    return enrichedItems;
  },

  subscribeToSetlistItems: (setlistId: string, onUpdate: (items: WorshipSetlistItem[]) => void, onError: (error: Error) => void) => {
    const q = query(
      collection(db, 'worshipSetlistItems'),
      where('setlistId', '==', setlistId),
      orderBy('order', 'asc')
    );
    return onSnapshot(
      q,
      async (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorshipSetlistItem));
        
        // Enrich items with song data
        const enrichedItems = await Promise.all(items.map(async (item) => {
          const songDocRef = doc(db, 'songs', item.songId);
          const songDoc = await getDoc(songDocRef);
          if (songDoc.exists()) {
            item.song = { id: songDoc.id, ...songDoc.data() } as Song;
          }
          return item;
        }));
        
        onUpdate(enrichedItems);
      },
      onError
    );
  }
};
