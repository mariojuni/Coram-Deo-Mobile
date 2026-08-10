const admin = require('firebase-admin');
const serviceAccount = require('../scripts/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = require('firebase-admin/firestore').getFirestore(admin.app(), 'coramdeo'); // named coramdeo db
async function main() {
  const bv = await db.collection('bibleVersions').get();
  console.log('bibleVersions:', bv.size);
  bv.forEach(doc => console.log('  ', doc.id, doc.data().sourceStoragePath));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
