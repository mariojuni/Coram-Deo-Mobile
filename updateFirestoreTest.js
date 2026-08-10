import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

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

async function testUpdate() {
  const chapterRef = doc(db, 'bibleVersions', '59', 'books', 'GEN', 'chapters', '1');
  const docSnap = await getDoc(chapterRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log('Original verses[0]:', data.verses[0]);
    
    // Add dummy heading and crossReference to the first verse
    data.verses[0].heading = 'The Creation of the World (Test)';
    // Add the note marker into the content if it's not already there
    if (!data.verses[0].content.includes('{{note:0}}')) {
      data.verses[0].content = data.verses[0].content + ' {{note:0}}';
    }
    
    data.verses[0].crossReferences = [
      {
        text: 'Test Cross Reference: John 1:1',
        refs: [{ id: 'JHN.1.1', text: 'John 1:1' }]
      }
    ];
    
    await updateDoc(chapterRef, { verses: data.verses });
    console.log('Successfully updated Genesis 1 in Firestore!');
    console.log('Reload your mobile app and check Genesis 1:1.');
  } else {
    console.log('Genesis 1 not found in bibleVersions/59');
  }
}

testUpdate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
