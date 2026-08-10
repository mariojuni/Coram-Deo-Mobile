import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function checkHeading() {
  const chapterRef = doc(db, 'bibleVersions', '59', 'books', 'GEN', 'chapters', '1');
  const docSnap = await getDoc(chapterRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log('Global library Genesis 1 verses[0].heading:', data.verses[0].heading);
  } else {
    console.log('Global library Genesis 1 NOT FOUND');
    
    // Check fallback legacy
    const fallbackRef = doc(db, 'bibles', '59', 'chapters', 'GEN.1');
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists()) {
      const fbData = fallbackSnap.data();
      console.log('Fallback library Genesis 1 verses[0].heading:', fbData.verses[0].heading);
    } else {
      console.log('Fallback library Genesis 1 NOT FOUND');
    }
  }
}

checkHeading().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
