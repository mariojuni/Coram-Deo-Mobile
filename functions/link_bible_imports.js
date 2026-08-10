const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { getFirestore } = require('firebase-admin/firestore');

// 1. Authenticate using your gcloud Application Default Credentials
const app = initializeApp({
  credential: applicationDefault(),
  projectId: 'coramdeo-prod'
});

const bucket = getStorage(app).bucket('coramdeo-prod.firebasestorage.app');
const db = getFirestore(app, 'coramdeo'); // ← IMPORTANT: the app uses the "coramdeo" named database, NOT the default!

async function main() {
  console.log("Scanning Firebase Storage for uploaded Bibles in 'coramdeo-prod'...");
  
  // 2. Fetch all files from the bible_imports/ folder
  const [files] = await bucket.getFiles({ prefix: 'bible_imports/' });
  
  let updatedCount = 0;
  
  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;
    
    // 3. Extract the version ID from the filename (e.g., "59_1786289247917.json" -> "59")
    // Filename is like bible_imports/59_1786289247917.json
    const filename = file.name.split('/').pop();
    const versionId = filename.split('_')[0];
    
    if (!versionId || isNaN(parseInt(versionId))) {
      console.log(`⚠️ Skipping ${file.name} - couldn't parse Version ID`);
      continue;
    }

    // 4. Get the download token for the public URL
    const [metadata] = await file.getMetadata();
    const token = metadata.metadata?.firebaseStorageDownloadTokens;
    
    if (!token) {
      console.log(`⚠️ No download token found for ${file.name}. Ensure it was uploaded via Firebase Console or SDK.`);
      continue;
    }

    // 5. Construct the full Firebase Storage URL
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
    
    // 6. Update Firestore
    try {
      const docRef = db.collection('bibleVersions').doc(versionId);
      
      // We use { merge: true } in case the document doesn't exist or we don't want to overwrite other fields
      await docRef.set({ sourceStoragePath: publicUrl }, { merge: true });
      console.log(`✅ Version ${versionId}: Successfully linked to -> ${publicUrl}`);
      updatedCount++;
    } catch (e) {
      console.error(`❌ Failed to update Version ${versionId} in Firestore bibleVersions:`, e.message);
    }
  }
  
  console.log(`\n🎉 Finished! Linked ${updatedCount} Bible versions.`);
}

main().then(()=>process.exit(0)).catch(e=>{
  console.error('\n❌ Script failed. If this says "The billing account... is disabled", make sure you enabled billing in Google Cloud.');
  console.error(e.message);
  process.exit(1);
});
