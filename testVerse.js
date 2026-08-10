import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Manually parse .env
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const chapterRef = doc(db, 'bibleVersions', '59', 'books', 'GEN', 'chapters', '3');
  const docSnap = await getDoc(chapterRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const verseWithNotes = data.verses.find(v => v.notes || v.crossReferences || v.heading);
    console.log("Found verse with metadata in Genesis 3:");
    console.log(JSON.stringify(verseWithNotes, null, 2));
  } else {
    console.log("Genesis 3 not found in bibleVersions!");
  }
}

test().then(() => process.exit(0)).catch(console.error);
