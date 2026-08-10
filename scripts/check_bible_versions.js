const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBOqlIDMBWNz2VbEbKETbMNRFGZIUlPJeU', // Fallback to a known one if env fails
  projectId: 'coramdeo-prod',
  storageBucket: 'coramdeo-prod.firebasestorage.app',
};

async function main() {
  try {
    const app = initializeApp(config, 'prod');
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, 'bibleVersions'));
    
    console.log(`Found ${snapshot.size} bible versions.`);
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
