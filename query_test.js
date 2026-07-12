const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'lifeconnect-fcd90', // from google-services.json
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runQuery() {
  try {
    const sermonsRef = collection(db, 'sermons');
    const q = query(
      sermonsRef,
      where('status', '==', 'published'),
      where('churchId', '==', 'dummy-church-id'),
      orderBy('sermonDate', 'desc'),
      limit(20)
    );
    await getDocs(q);
    console.log("Query 1 successful");
  } catch (error) {
    console.error("Query 1 Error:", error.message);
  }
}

runQuery();
