import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
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
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
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
  }
};
