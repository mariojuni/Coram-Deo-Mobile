const admin = require('firebase-admin');
const serviceAccount = require('../scripts/serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = require('firebase-admin/firestore').getFirestore(admin.app(), 'coramdeo'); // named coramdeo db
async function main() {
  const docRef = db.collection('bibleVersions').doc('59');
  const doc = await docRef.get();
  console.log('Doc 59 exists:', doc.exists);
  if(doc.exists) console.log('Doc 59 data:', doc.data());
  else {
    // maybe there's a subcollection?
    const cols = await docRef.listCollections();
    console.log('Subcollections of 59:', cols.map(c=>c.id));
  }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
