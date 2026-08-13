import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { getActiveDb } from '@/firebase';
import { collection, getDocs, doc, writeBatch, Timestamp, getDoc } from 'firebase/firestore';
import { bibleHighlightRepository } from '@/features/bibleHighlights/data/bibleHighlight.repository';
import type { BibleHighlight } from '@/features/bibleHighlights/domain/bibleHighlight.types';
import { SoftCard } from '@/components/ui/SoftCard';
import { LinearGradient } from 'expo-linear-gradient';

export default function MigrateHighlightsScreen() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const runMigration = async () => {
    setLoading(true);
    setLogs([]);
    try {
      const db = getActiveDb();
      
      addLog('Starting migration...');
      let totalMigrated = 0;

      // 1. Migrate Church Highlights (Public)
      addLog('Fetching churches...');
      const churchesSnap = await getDocs(collection(db, 'churches'));
      for (const churchDoc of churchesSnap.docs) {
        const churchId = churchDoc.id;
        addLog(`Processing church: ${churchId}`);
        
        const verseHighlightsSnap = await getDocs(collection(db, 'churches', churchId, 'verse_highlights'));
        addLog(`Found ${verseHighlightsSnap.size} public highlights in church ${churchId}`);
        
        for (const highlightDoc of verseHighlightsSnap.docs) {
          try {
            const data = highlightDoc.data();
            const legacyId = highlightDoc.id;
            
            // Check if it already exists (to avoid duplicates)
            const newId = `${data.userId}_${data.passageId}_${data.verseNumbers?.join('-') || data.verseNumber}_pub`;
            
            const existingRef = doc(db, 'bibleVerseHighlights', newId);
            const existingSnap = await getDoc(existingRef);
            if (existingSnap.exists()) {
               continue;
            }

            const docData: BibleHighlight = {
              id: newId,
              userId: data.userId,
              userName: data.userName || 'Anonymous',
              userPhotoUrl: data.userPhotoUrl || undefined,
              churchId: churchId,
              visibility: 'church',
              passageId: data.passageId,
              status: 'active',
              bookName: data.bookName || data.passageId.split('.')[0],
              chapter: data.chapter,
              verseNumber: data.verseNumber,
              verseRangeLabel: data.verseRangeLabel || String(data.verseNumber),
              verseNumbers: data.verseNumbers || [data.verseNumber],
              color: data.color || 'yellow',
              text: data.text || '',
              likes: data.likes || 0,
              likedBy: data.likedBy || [],
              commentCount: data.commentCount || 0,
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
            };

            const batch = writeBatch(db);
            batch.set(existingRef, docData);
            
            // Optional: delete old one
            // batch.delete(highlightDoc.ref);
            
            await batch.commit();
            totalMigrated++;
          } catch (err) {
            addLog(`Error migrating highlight ${highlightDoc.id}: ${err}`);
          }
        }
      }

      // 2. Migrate User Preferences Highlights (Private)
      addLog('Fetching users for private highlights...');
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        
        const prefsRef = doc(db, 'users', userId, 'bible', 'preferences');
        const prefsSnap = await getDoc(prefsRef);
        if (prefsSnap.exists()) {
          const prefsData = prefsSnap.data();
          const highlights = prefsData.highlights || {};
          
          let userHighlightCount = 0;
          for (const [passageId, verses] of Object.entries(highlights)) {
            if (!verses || typeof verses !== 'object') continue;
            const [book, chapter] = passageId.split('.');
            
            for (const [verseStr, val] of Object.entries(verses as Record<string, any>)) {
               const vNum = parseInt(verseStr, 10);
               if (isNaN(vNum)) continue;
               
               let color = 'yellow';
               let createdAt: any = Timestamp.now();
               
               if (typeof val === 'object' && val !== null) {
                 color = val.color || 'yellow';
                 if (val.createdAt) {
                   createdAt = typeof val.createdAt === 'string' ? Timestamp.fromDate(new Date(val.createdAt)) : val.createdAt;
                 }
               } else {
                 color = String(val);
               }
               
               const newId = `${userId}_${passageId}_${vNum}_priv`;
               const existingRef = doc(db, 'bibleVerseHighlights', newId);
               const existingSnap = await getDoc(existingRef);
               if (existingSnap.exists()) continue;

               const docData: BibleHighlight = {
                id: newId,
                userId: userId,
                visibility: 'private',
                passageId,
                status: 'active',
                bookName: book,
                chapter: parseInt(chapter, 10) || 1,
                verseNumber: vNum,
                verseRangeLabel: String(vNum),
                verseNumbers: [vNum],
                color,
                text: '', // text might not be saved in preferences
                likes: 0,
                likedBy: [],
                commentCount: 0,
                createdAt: createdAt,
                updatedAt: createdAt,
              };

              const batch = writeBatch(db);
              batch.set(existingRef, docData);
              await batch.commit();
              totalMigrated++;
              userHighlightCount++;
            }
          }
          if (userHighlightCount > 0) {
            addLog(`Migrated ${userHighlightCount} private highlights for user ${userId}`);
          }
        }
      }

      addLog(`Migration complete! Total migrated: ${totalMigrated}`);
      Alert.alert('Success', `Migration complete. Migrated ${totalMigrated} items.`);
    } catch (err: any) {
      addLog(`MIGRATION FAILED: ${err.message}`);
      Alert.alert('Error', 'Migration failed. Check logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Migrate Highlights', headerBackVisible: false }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <SoftCard innerStyle={{ padding: 20 }}>
          <Text style={styles.title}>Highlight Migration</Text>
          <Text style={styles.desc}>
            This will copy all highlights from user preferences and church verse_highlights to the new top-level bibleVerseHighlights collection.
          </Text>

          <TouchableOpacity 
            style={[styles.btn, loading && { opacity: 0.7 }]} 
            onPress={runMigration} 
            disabled={loading}
          >
            <LinearGradient colors={['#FF6596', '#FF8F6B']} style={styles.btnGradient}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Start Migration</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </SoftCard>

        <Text style={styles.logTitle}>Migration Logs</Text>
        <View style={styles.logContainer}>
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && <Text style={styles.logText}>No logs yet.</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#111827' },
  desc: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 20 },
  btn: { borderRadius: 12, overflow: 'hidden' },
  btnGradient: { paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  logTitle: { fontSize: 16, fontWeight: '600', marginTop: 30, marginBottom: 10, color: '#111827' },
  logContainer: { backgroundColor: '#111827', borderRadius: 8, padding: 12, minHeight: 150 },
  logText: { color: '#10B981', fontFamily: 'Courier', fontSize: 12, marginBottom: 4 }
});
