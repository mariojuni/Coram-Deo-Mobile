const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');
admin.initializeApp({ credential: applicationDefault(), projectId: 'coramdeo-prod' });
const db = require('firebase-admin/firestore').getFirestore(admin.app(), 'coramdeo'); // named coramdeo db
async function main() {
  const docs = await db.collection('bibleImports').get();
  docs.forEach(d => console.log(d.id, d.data()));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
