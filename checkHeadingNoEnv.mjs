import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
      console.log('Fallback library Genesis 1 verses[1].heading:', fbData.verses[1].heading);
    } else {
      console.log('Fallback library Genesis 1 NOT FOUND');
    }
  }
}

checkHeading().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
