const admin = require('firebase-admin');

// Use Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'coramdeo-prod'
});

const bucket = admin.storage().bucket('coramdeo-prod.firebasestorage.app');

async function main() {
  const [files] = await bucket.getFiles({ prefix: 'bible_imports/' });
  console.log(`Found ${files.length} files in bible_imports/`);
  
  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;
    const [metadata] = await file.getMetadata();
    const token = metadata.metadata?.firebaseStorageDownloadTokens;
    let url = '';
    if (token) {
      url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
    } else {
      url = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    }
    console.log(`- ${file.name} -> token: ${token ? 'yes' : 'no'} URL: ${url}`);
  }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
