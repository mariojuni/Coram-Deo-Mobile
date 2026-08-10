const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');
admin.initializeApp({ credential: applicationDefault(), projectId: 'coramdeo-prod' });
const db = require('firebase-admin/firestore').getFirestore(admin.app(), 'coramdeo'); // named coramdeo db
async function main() {
  const doc = await db.collection('bibleImports').doc('59').get();
  console.log('bibleImports/59:', doc.data());
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
