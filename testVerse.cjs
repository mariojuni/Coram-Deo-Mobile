const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const chapterRef = doc(db, 'bibleVersions', '59', 'books', 'GEN', 'chapters', '1');
  const docSnap = await getDoc(chapterRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const verseWithNotes = data.verses.find(v => v.crossReferences || v.notes || (v.content && v.content.includes('{{note:')));
    console.log(JSON.stringify(verseWithNotes, null, 2));
  } else {
    console.log('Not found');
  }
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
