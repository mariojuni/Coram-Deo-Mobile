const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBOqlIDMBWNz2VbEbKETbMNRFGZIUlPJeU',
  projectId: 'nazarenechurch-9c030',
  storageBucket: 'nazarenechurch-9c030.appspot.com',
};

async function main() {
  try {
    const app = initializeApp(config, 'staging');
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, 'bibleVersions'));
    
    console.log(`Found ${snapshot.size} bible versions in nazarenechurch-9c030.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nID: ${doc.id}`);
      console.log(`Name: ${data.abbreviation || data.name}`);
      console.log(`Storage Path: ${data.sourceStoragePath || 'NOT SET'}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main().then(() => process.exit(0));
