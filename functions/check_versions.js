const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');
admin.initializeApp({ credential: applicationDefault(), projectId: 'coramdeo-prod' });
const db = require('firebase-admin/firestore').getFirestore(admin.app(), 'coramdeo'); // named coramdeo db
async function main() {
  const bv = await db.collection('bibleVersions').get();
  console.log('bibleVersions size:', bv.size);
  const bi = await db.collection('bibleImports').get();
  console.log('bibleImports size:', bi.size);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
