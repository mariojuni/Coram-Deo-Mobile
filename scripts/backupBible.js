const fetch = require('node-fetch'); // you may need to 'npm install node-fetch@2' if running this on older Node
const { getFirestore } = require('firebase-admin/firestore');
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.error("Please place your Firebase 'serviceAccountKey.json' in the scripts folder!");
  process.exit(1);
}

// ⚠️ IMPORTANT: Production uses the "coramdeo" named database, NOT the (default) database
const db = getFirestore(admin.app(), 'coramdeo');

const API_BASE = 'https://api.youversion.com/v1';
const API_KEY = 'RAhHurUzL1pk5kt9LwrGIaz0AdnX0obcIH6NNIayuvGogR7f';
const BATCH_SIZE = 5;

// Helper to parse YouVersion HTML into a clean JSON structure
function parseHTMLToJSON(html, passageId) {
  const verses = [];
  
  // A very basic regex parser to extract verses from the HTML format.
  // The YouVersion HTML format wraps verses in spans with classes like `yv-v` and attributes `v="1"`
  const verseRegex = /<span[^>]*class="[^"]*yv-v[^"]*"[^>]*v="(\d+)"[^>]*>(.*?)<\/span>(.*?)(?=<span[^>]*class="[^"]*yv-v|$)/gs;
  
  let match;
  while ((match = verseRegex.exec(html)) !== null) {
    const verseNumber = match[1];
    
    // Combine the verse label span and the following text, and strip all HTML tags
    let rawText = (match[2] + " " + match[3]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Sometimes verse text gets bunched with chapter numbers, clean it up
    if (rawText.length > 0) {
      verses.push({
        id: `${passageId}.${verseNumber}`,
        verseNumber: verseNumber,
        content: rawText
      });
    }
  }

  // If the regex failed to find verses (some chapters might be formatted differently), fallback to saving the whole chunk
  if (verses.length === 0 && html.length > 0) {
     verses.push({
        id: passageId,
        verseNumber: "1",
        content: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
     });
  }
  
  return verses;
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'x-yvp-app-key': API_KEY, 'Accept': 'application/json' } });
      if (res.ok) return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

async function backupBible(translationId) {
  console.log(`Starting backup for Bible Version: ${translationId}`);
  
  // 1. Fetch Index
  const indexData = await fetchWithRetry(`${API_BASE}/bibles/${translationId}/index`);
  if (!indexData) {
    console.error("Failed to fetch Bible index.");
    return;
  }
  
  // Upload Index to Firestore
  try {
    await db.collection('bibles').doc(String(translationId)).set({
      index: indexData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Uploaded Index for ${translationId} to Firestore.`);
  } catch (e) {
    console.error(`❌ Error uploading index:`, e.message);
  }

  const allPassageIds = [];
  for (const book of indexData.books) {
    for (const chapter of book.chapters) {
      if (chapter.passage_id) {
        allPassageIds.push(chapter.passage_id);
      }
    }
  }

  console.log(`Found ${allPassageIds.length} chapters to backup.`);

  // 2. Fetch and upload in batches
  for (let i = 0; i < allPassageIds.length; i += BATCH_SIZE) {
    const batch = allPassageIds.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (passageId) => {
      try {
        console.log(`Fetching ${passageId}...`);
        const data = await fetchWithRetry(`${API_BASE}/bibles/${translationId}/passages/${passageId}?format=html`);
        
        if (data && data.content) {
          const parsedVerses = parseHTMLToJSON(data.content, passageId);
          
          // Upload to Firestore
          await db.collection('bibles').doc(String(translationId)).collection('chapters').doc(passageId).set({
            passage_id: passageId,
            verses: parsedVerses,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Uploaded ${passageId} to Firestore.`);
        }
      } catch (e) {
        console.error(`❌ Error fetching/uploading ${passageId}:`, e.message);
      }
    }));
    
    // Sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`🎉 Backup of Bible Version ${translationId} completed successfully!`);
}

// Run the script (Pass the translation ID as a command line argument, e.g., node backupBible.js 2692)
const args = process.argv.slice(2);
const targetVersion = args[0] || '2692';
backupBible(targetVersion);
