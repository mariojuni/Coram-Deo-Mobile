/**
 * Firebase Sermon Data Seeder
 * 
 * This script helps you populate your Firebase Firestore with sample sermon data.
 * 
 * SETUP:
 * 1. Ensure you have admin access to your Firebase project
 * 2. Run this script with: node scripts/seedSermons.js
 * 
 * NOTE: You'll need to update this with your actual Firebase Admin SDK credentials
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Check environment to prevent seeding production
if (process.env.APP_ENV === 'production' || process.env.EXPO_PUBLIC_APP_ENV === 'production') {
  console.error('❌ SEED SCRIPT BLOCKED: Cannot run seed scripts in the production environment! Data safety safeguard triggered.');
  process.exit(1);
}

// Initialize Firebase Admin (you'll need to add your service account key)
// Download from: Firebase Console > Project Settings > Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Sample sermon data
const sampleSermons = [
  {
    title: "Faith in Uncertain Times",
    description: "Join us as we explore how to maintain faith and trust in God during life's most challenging moments. This powerful message will encourage you to stand firm on God's promises.",
    type: "video",
    videoUrl: "https://storage.googleapis.com/your-bucket/sermons/faith-uncertain-times.mp4",
    audioUrl: "https://storage.googleapis.com/your-bucket/sermons/faith-uncertain-times.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    duration: 2640, // 44 minutes in seconds
    speaker: {
      id: "speaker_001",
      name: "Pastor John Smith",
      bio: "Senior Pastor with over 20 years of ministry experience, passionate about teaching biblical truths and helping people grow in their faith.",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
    },
    date: new Date('2024-01-07'),
    seriesId: "series_001",
    series: {
      id: "series_001",
      title: "Living by Faith",
      description: "A 6-week series on developing unwavering faith",
      thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      startDate: new Date('2024-01-07'),
      endDate: new Date('2024-02-18')
    },
    scriptureReferences: [
      { book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: 6 },
      { book: "James", chapter: 1, verseStart: 2, verseEnd: 8 }
    ],
    tags: ["faith", "trust", "encouragement", "hope"],
    resources: [
      {
        id: "res_001",
        title: "Faith Study Guide",
        type: "pdf",
        url: "https://storage.googleapis.com/your-bucket/resources/faith-study-guide.pdf"
      }
    ],
    viewCount: 234,
    favoriteCount: 45,
    status: "published",
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-07'),
    publishedAt: new Date('2024-01-07')
  },
  {
    title: "The Power of Prayer",
    description: "Discover the transformative power of prayer in your daily life. Learn practical ways to deepen your prayer life and experience God's presence more fully.",
    type: "audio",
    audioUrl: "https://storage.googleapis.com/your-bucket/sermons/power-of-prayer.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800",
    duration: 1920, // 32 minutes
    speaker: {
      id: "speaker_002",
      name: "Pastor Sarah Johnson",
      bio: "Associate Pastor focused on prayer ministry and spiritual formation.",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
    },
    date: new Date('2024-01-14'),
    scriptureReferences: [
      { book: "Matthew", chapter: 6, verseStart: 5, verseEnd: 15 },
      { book: "1 Thessalonians", chapter: 5, verseStart: 16, verseEnd: 18 }
    ],
    tags: ["prayer", "spiritual-growth", "devotion"],
    resources: [],
    viewCount: 189,
    favoriteCount: 32,
    status: "published",
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    publishedAt: new Date('2024-01-14')
  },
  {
    title: "Love One Another",
    description: "Exploring what it truly means to love others as Christ loved us. A practical guide to living out the greatest commandment in our daily relationships.",
    type: "video",
    videoUrl: "https://storage.googleapis.com/your-bucket/sermons/love-one-another.mp4",
    audioUrl: "https://storage.googleapis.com/your-bucket/sermons/love-one-another.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1516714819001-8ee7a13b71d7?w=800",
    duration: 2880, // 48 minutes
    speaker: {
      id: "speaker_001",
      name: "Pastor John Smith",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
    },
    date: new Date('2024-01-21'),
    seriesId: "series_002",
    series: {
      id: "series_002",
      title: "The Greatest Commandment",
      description: "Learning to love God and love others",
      thumbnailUrl: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800",
      startDate: new Date('2024-01-21'),
      endDate: new Date('2024-02-25')
    },
    scriptureReferences: [
      { book: "John", chapter: 13, verseStart: 34, verseEnd: 35 },
      { book: "1 Corinthians", chapter: 13, verseStart: 1, verseEnd: 13 }
    ],
    tags: ["love", "relationships", "commandment", "service"],
    resources: [],
    viewCount: 312,
    favoriteCount: 67,
    status: "published",
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21'),
    publishedAt: new Date('2024-01-21')
  },
  {
    title: "Finding Peace in the Storm",
    description: "When life's storms rage around us, where do we turn? This message explores biblical principles for finding inner peace regardless of external circumstances.",
    type: "audio",
    audioUrl: "https://storage.googleapis.com/your-bucket/sermons/peace-in-storm.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=800",
    duration: 2160, // 36 minutes
    speaker: {
      id: "speaker_003",
      name: "Pastor Michael Davis",
      bio: "Youth Pastor with a heart for reaching the next generation for Christ.",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
    },
    date: new Date('2024-01-28'),
    seriesId: "series_001",
    series: {
      id: "series_001",
      title: "Living by Faith",
      description: "A 6-week series on developing unwavering faith",
      thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      startDate: new Date('2024-01-07'),
      endDate: new Date('2024-02-18')
    },
    scriptureReferences: [
      { book: "Philippians", chapter: 4, verseStart: 6, verseEnd: 7 },
      { book: "Isaiah", chapter: 26, verseStart: 3, verseEnd: 4 }
    ],
    tags: ["peace", "anxiety", "trust", "faith"],
    resources: [],
    viewCount: 156,
    favoriteCount: 28,
    status: "published",
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28'),
    publishedAt: new Date('2024-01-28')
  },
  {
    title: "The Joy of Salvation",
    description: "Rediscovering the joy that comes from knowing Christ. This uplifting message will remind you of the incredible gift of salvation and inspire gratitude.",
    type: "video",
    videoUrl: "https://storage.googleapis.com/your-bucket/sermons/joy-of-salvation.mp4",
    audioUrl: "https://storage.googleapis.com/your-bucket/sermons/joy-of-salvation.mp3",
    thumbnailUrl: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=800",
    duration: 2520, // 42 minutes
    speaker: {
      id: "speaker_002",
      name: "Pastor Sarah Johnson",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
    },
    date: new Date('2024-02-04'),
    scriptureReferences: [
      { book: "Psalm", chapter: 51, verseStart: 12, verseEnd: 12 },
      { book: "Nehemiah", chapter: 8, verseStart: 10, verseEnd: 10 }
    ],
    tags: ["joy", "salvation", "gratitude", "worship"],
    resources: [
      {
        id: "res_002",
        title: "Joy Journal",
        type: "pdf",
        url: "https://storage.googleapis.com/your-bucket/resources/joy-journal.pdf"
      }
    ],
    viewCount: 278,
    favoriteCount: 53,
    status: "published",
    createdAt: new Date('2024-02-04'),
    updatedAt: new Date('2024-02-04'),
    publishedAt: new Date('2024-02-04')
  }
];

// Function to seed sermons
async function seedSermons() {
  console.log('Starting sermon seeding...');

  try {
    const sermonsRef = db.collection('sermons');

    for (const sermon of sampleSermons) {
      // Convert Date objects to Firestore Timestamps
      const sermonData = {
        ...sermon,
        date: Timestamp.fromDate(sermon.date),
        createdAt: Timestamp.fromDate(sermon.createdAt),
        updatedAt: Timestamp.fromDate(sermon.updatedAt),
        publishedAt: Timestamp.fromDate(sermon.publishedAt),
      };

      if (sermon.series) {
        sermonData.series = {
          ...sermon.series,
          startDate: Timestamp.fromDate(sermon.series.startDate),
          endDate: Timestamp.fromDate(sermon.series.endDate),
        };
      }

      const docRef = await sermonsRef.add(sermonData);
      console.log(`✅ Added sermon: ${sermon.title} (ID: ${docRef.id})`);
    }

    console.log('\n🎉 Successfully seeded all sermons!');
    console.log(`Total sermons added: ${sampleSermons.length}`);

  } catch (error) {
    console.error('❌ Error seeding sermons:', error);
  }
}

// MANUAL SEEDING INSTRUCTIONS:
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  SERMON DATA SEEDING GUIDE                      ║
╚═══════════════════════════════════════════════════════════════╝

To populate your Firebase with sample sermon data:

OPTION 1: Use Firebase Console (Recommended for Testing)
---------------------------------------------------------
1. Go to Firebase Console > Firestore Database
2. Create a collection called "sermons"
3. Click "Add Document"
4. Use the sample data below (one sermon at a time)

OPTION 2: Use This Script
--------------------------
1. Download your Firebase Admin SDK private key:
   - Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as 'serviceAccountKey.json' in /scripts folder

2. Uncomment the Firebase Admin initialization code above

3. Run: node scripts/seedSermons.js

OPTION 3: Use Firebase Emulator (Best for Development)
-------------------------------------------------------
1. Install Firebase tools: npm install -g firebase-tools
2. Run: firebase init emulators
3. Select Firestore emulator
4. Start emulator: firebase emulators:start
5. Run this script pointing to emulator

SAMPLE SERMON DOCUMENT STRUCTURE:
----------------------------------
{
  "title": "Faith in Uncertain Times",
  "description": "Join us as we explore...",
  "type": "video",
  "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "audioUrl": "",
  "thumbnailUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
  "duration": 2640,
  "speaker": {
    "id": "speaker_001",
    "name": "Pastor John Smith",
    "bio": "Senior Pastor...",
    "photoUrl": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
  },
  "date": "2024-01-07T00:00:00Z",
  "scriptureReferences": [
    { "book": "Hebrews", "chapter": 11, "verseStart": 1, "verseEnd": 6 }
  ],
  "tags": ["faith", "trust", "encouragement"],
  "resources": [],
  "viewCount": 0,
  "favoriteCount": 0,
  "status": "published",
  "createdAt": "2024-01-07T00:00:00Z",
  "updatedAt": "2024-01-07T00:00:00Z",
  "publishedAt": "2024-01-07T00:00:00Z"
}

FREE SAMPLE VIDEO/AUDIO FOR TESTING:
-------------------------------------
Video: https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
Audio: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3

NOTE: Replace these with your actual sermon media URLs before production!
`);

// Uncomment to run seeding:
seedSermons().then(() => process.exit(0));

module.exports = { sampleSermons, seedSermons };
