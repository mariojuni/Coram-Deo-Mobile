const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp({ credential: applicationDefault(), projectId: 'coramdeo-prod' });

// ⚠️ IMPORTANT: Production uses the "coramdeo" named database, NOT the (default) database
const db = getFirestore(admin.app(), 'coramdeo');

async function main() {
  const bv = await db.collection('bibleVersions').get();
  console.log('bibleVersions size:', bv.size);
  bv.forEach(d => console.log('bibleVersions:', d.id, d.data()));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
