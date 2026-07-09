import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyATJtgk582X0ik4GwqXes64uE6OMxsXrfw",
  authDomain: "nazarenechurch-9c030.firebaseapp.com",
  projectId: "nazarenechurch-9c030",
  storageBucket: "nazarenechurch-9c030.firebasestorage.app",
  messagingSenderId: "676505939287",
  appId: "1:676505939287:web:f2e467529a4286dceda212",
  measurementId: "G-MBYCGYVF2F",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findSong() {
  const q = query(collection(db, 'songs'));
  const snapshot = await getDocs(q);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.title && data.title.toLowerCase().includes("christ the true")) {
      console.log("Found song:", doc.id);
      console.log("Title:", data.title);
      console.log("Lyrics:");
      console.log(data.lyrics);
      console.log("===================================");
      console.log("ChordChart:");
      console.log(data.chordChart);
      console.log("===================================");
      console.log("LyricsWithChords:");
      console.log(data.lyricsWithChords);
      return;
    }
  }
  console.log("Song not found.");
}

findSong().catch(console.error);
