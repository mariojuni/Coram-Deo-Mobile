const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// To run this, you need your service account key file or standard auth.
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

async function migrateGivingRecords() {
  console.log('--- Migrating Giving Records ---');
  let migratedCount = 0;
  
  const snapshot = await db.collection('givingRecords').get();
  
  if (snapshot.empty) {
    console.log('No giving records found to migrate.');
  } else {
    const batch = db.batch();
    snapshot.forEach(doc => {
      const data = doc.data();
      let needsUpdate = false;
      const updateData = {};

      if (data.status === 'approved') {
        updateData.status = 'completed';
        needsUpdate = true;
      }

      if (['approved', 'completed'].includes(data.status) && !data.date) {
        // Fallback to submittedAt, then createdAt, then now
        let fallbackDate = data.submittedAt || data.createdAt || new Date();
        // If it's a Firestore Timestamp, convert it to a Date
        if (fallbackDate && typeof fallbackDate.toDate === 'function') {
           fallbackDate = fallbackDate.toDate();
        }
        // If it's a Date object or Timestamp converted to Date
        if (fallbackDate instanceof Date) {
           fallbackDate = fallbackDate.toISOString();
        }
        // Extract YYYY-MM-DD
        updateData.date = String(fallbackDate).split('T')[0];
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateData.updatedAt = FieldValue.serverTimestamp();
        batch.update(doc.ref, updateData);
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`Successfully migrated ${migratedCount} giving records.`);
    } else {
      console.log('No giving records needed migration.');
    }
  }
}

async function migrateGivingExpenses() {
  console.log('--- Migrating Giving Expenses ---');
  let migratedCount = 0;
  
  const snapshot = await db.collection('givingExpenses').get();
  
  if (snapshot.empty) {
    console.log('No giving expenses found.');
  } else {
    const batch = db.batch();
    snapshot.forEach(doc => {
      const data = doc.data();
      let needsUpdate = false;
      const updateData = {};
      
      if (data.expenseDate && !data.date) {
        updateData.date = data.expenseDate;
        updateData.expenseDate = FieldValue.delete();
        needsUpdate = true;
      }
      
      if (data.vendorName && !data.payee) {
        updateData.payee = data.vendorName;
        updateData.vendorName = FieldValue.delete();
        needsUpdate = true;
      }
      
      if (data.title && !data.payee) {
         updateData.payee = data.title;
         updateData.title = FieldValue.delete();
         needsUpdate = true;
      }

      if (needsUpdate) {
        updateData.updatedAt = FieldValue.serverTimestamp();
        batch.update(doc.ref, updateData);
        migratedCount++;
      }
    });
    
    if (migratedCount > 0) {
        await batch.commit();
        console.log(`Successfully migrated ${migratedCount} giving expenses to use 'date' and 'payee'.`);
    } else {
        console.log(`No giving expenses needed migration.`);
    }
  }
}

async function run() {
  try {
    await migrateGivingRecords();
    await migrateGivingExpenses();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
