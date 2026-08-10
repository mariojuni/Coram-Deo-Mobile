/**
 * One-time script to set sourceStoragePath in Firestore bibleVersions/59.
 * Run with: node scripts/update_bible_version_storage_path.js
 * 
 * This sets the sourceStoragePath field so the app always knows where to download the ESV file.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc, getDoc } = require('firebase/firestore');

const STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/coramdeo-prod.firebasestorage.app/o/bible_imports%2F59_1786289247917.json?alt=media&token=a54df26e-fd8a-4e71-a04e-4bc1cc958d61';

const configs = [
  {
    name: 'Production (coramdeo-prod)',
    config: {
      apiKey: 'AIzaSyBOqlIDMBWNz2VbEbKETbMNRFGZIUlPJeU', // will read from env
      projectId: 'coramdeo-prod',
      storageBucket: 'coramdeo-prod.firebasestorage.app',
    }
  },
  {
    name: 'Staging (nazarenechurch-9c030)',
    config: {
      apiKey: 'AIzaSyBOqlIDMBWNz2VbEbKETbMNRFGZIUlPJeU', // will read from env
      projectId: 'nazarenechurch-9c030',
      storageBucket: 'nazarenechurch-9c030.appspot.com',
    }
  }
];

async function main() {
  for (const { name, config } of configs) {
    try {
      console.log(`\nUpdating ${name}...`);
      const app = initializeApp(config, name);
      const db = getFirestore(app);
      const ref = doc(db, 'bibleVersions', '59');
      await updateDoc(ref, { sourceStoragePath: STORAGE_URL });
      console.log(`✅ ${name}: sourceStoragePath set successfully`);
    } catch (e) {
      console.error(`❌ ${name}: ${e.message}`);
    }
  }
}

main().then(() => process.exit(0));
