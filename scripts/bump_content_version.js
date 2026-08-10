/**
 * bump_content_version.js
 * 
 * Bumps contentVersion on all bibleVersions documents in the "coramdeo" Firestore database.
 * This signals to the app that the Bible data has been updated (now JSON-based with
 * headings and cross-references), so users will be prompted to re-download.
 * 
 * Run with:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json node scripts/bump_content_version.js
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({
  credential: applicationDefault(),
  projectId: 'coramdeo-prod',
});

// ⚠️ IMPORTANT: Production uses the "coramdeo" named database, NOT the (default) database
const db = getFirestore(app, 'coramdeo');

// The new version to set — bump this whenever a major data update is pushed
const NEW_CONTENT_VERSION = 2;

async function main() {
  console.log(`\n📦 Bumping contentVersion to ${NEW_CONTENT_VERSION} for all bibleVersions in "coramdeo" database...`);

  const snapshot = await db.collection('bibleVersions').get();

  if (snapshot.empty) {
    console.log('❌ No bibleVersions documents found!');
    process.exit(1);
  }

  let updatedCount = 0;
  const batch = db.batch();

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const currentVersion = data.contentVersion ?? 1;
    console.log(`  → Version ${docSnap.id}: contentVersion ${currentVersion} → ${NEW_CONTENT_VERSION}`);
    batch.update(docSnap.ref, { contentVersion: NEW_CONTENT_VERSION });
    updatedCount++;
  });

  await batch.commit();
  console.log(`\n✅ Done! Bumped contentVersion to ${NEW_CONTENT_VERSION} for ${updatedCount} Bible versions.`);
  console.log('   Users will be prompted to re-download any Bibles they have installed.\n');
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Script failed:', e.message);
    process.exit(1);
  });
