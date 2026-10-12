import * as SQLite from 'expo-sqlite';
import type { BibleBook } from '../domain/BibleRepository';

const db = SQLite.openDatabaseSync('bible.db');

export const initDB = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS bible_indices (
      translationId TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS bible_chapters_v3 (
      translationId TEXT,
      passageId TEXT,
      content TEXT,
      PRIMARY KEY(translationId, passageId)
    );
    CREATE TABLE IF NOT EXISTS bible_books (
      translationId TEXT,
      bookId TEXT,
      name TEXT NOT NULL,
      longName TEXT,
      abbreviation TEXT,
      canon TEXT,
      orderIndex INTEGER NOT NULL,
      chapterCount INTEGER NOT NULL,
      chaptersJson TEXT,
      PRIMARY KEY(translationId, bookId)
    );
    CREATE TABLE IF NOT EXISTS bible_translations (
      id TEXT PRIMARY KEY,
      abbreviation TEXT,
      title TEXT,
      languageTag TEXT,
      contentVersion INTEGER,
      downloadedAt INTEGER,
      chapterCount INTEGER
    );
  `);
};

// Initialize DB immediately when module loads
initDB();

export const saveTranslationMeta = async (meta: {
  id: string | number;
  abbreviation?: string;
  title?: string;
  languageTag?: string;
  contentVersion?: number;
  chapterCount?: number;
}) => {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO bible_translations 
       (id, abbreviation, title, languageTag, contentVersion, downloadedAt, chapterCount) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(meta.id),
        meta.abbreviation || '',
        meta.title || '',
        meta.languageTag || 'en',
        meta.contentVersion || 1,
        Date.now(),
        meta.chapterCount || 0,
      ]
    );
    return true;
  } catch (error) {
    console.error(`Failed to save translation meta for ${meta.id}:`, error);
    return false;
  }
};

export const saveBibleIndex = async (translationId: string | number, indexData: any) => {
  try {
    const dataStr = JSON.stringify(indexData);
    db.runSync(
      'INSERT OR REPLACE INTO bible_indices (translationId, data) VALUES (?, ?)',
      [String(translationId), dataStr]
    );
    return true;
  } catch (error) {
    console.error(`Failed to save index for ${translationId}:`, error);
    return false;
  }
};

export const getBibleIndex = async (translationId: string | number) => {
  try {
    const row = db.getFirstSync<{ data: string }>(
      'SELECT data FROM bible_indices WHERE translationId = ?',
      [String(translationId)]
    );
    return row ? JSON.parse(row.data) : null;
  } catch (error) {
    console.error(`Failed to get index for ${translationId}:`, error);
    return null;
  }
};

export const saveBibleBooks = async (translationId: string | number, books: BibleBook[]) => {
  if (!books || books.length === 0) return true;
  try {
    db.withTransactionSync(() => {
      for (let i = 0; i < books.length; i++) {
        const b = books[i];
        const bookId = b.id || b.usfm || String(i);
        const chaptersJson = b.chapters ? JSON.stringify(b.chapters) : null;
        db.runSync(
          `INSERT OR REPLACE INTO bible_books 
           (translationId, bookId, name, longName, abbreviation, canon, orderIndex, chapterCount, chaptersJson) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(translationId),
            bookId,
            b.name || '',
            b.longName || null,
            b.abbreviation || null,
            b.canon || 'other',
            b.order ?? i,
            b.chapterCount || (b.chapters ? b.chapters.length : 0),
            chaptersJson,
          ]
        );
      }
    });
    return true;
  } catch (error) {
    console.error(`Failed to save books for ${translationId}:`, error);
    return false;
  }
};

export const getBibleBooks = async (translationId: string | number): Promise<BibleBook[] | null> => {
  try {
    const rows = db.getAllSync<{
      bookId: string;
      name: string;
      longName: string | null;
      abbreviation: string | null;
      canon: string | null;
      orderIndex: number;
      chapterCount: number;
      chaptersJson: string | null;
    }>(
      'SELECT * FROM bible_books WHERE translationId = ? ORDER BY orderIndex ASC',
      [String(translationId)]
    );

    if (!rows || rows.length === 0) return null;

    return rows.map((r) => ({
      id: r.bookId,
      usfm: r.bookId,
      name: r.name,
      longName: r.longName || undefined,
      abbreviation: r.abbreviation || undefined,
      canon: (r.canon as any) || 'other',
      order: r.orderIndex,
      chapterCount: r.chapterCount,
      chapters: r.chaptersJson ? JSON.parse(r.chaptersJson) : undefined,
    }));
  } catch (error) {
    console.error(`Failed to get books for ${translationId}:`, error);
    return null;
  }
};

export const saveChapter = async (translationId: string | number, passageId: string, chapterData: string) => {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO bible_chapters_v3 (translationId, passageId, content) VALUES (?, ?, ?)',
      [String(translationId), passageId, chapterData]
    );
    return true;
  } catch (error) {
    console.error(`Failed to save chapter ${passageId}:`, error);
    return false;
  }
};

export const saveChaptersBatch = async (
  translationId: string | number,
  chapters: Array<{ passageId: string; content: string }>
) => {
  if (!chapters || chapters.length === 0) return true;
  try {
    db.withTransactionSync(() => {
      for (const ch of chapters) {
        db.runSync(
          'INSERT OR REPLACE INTO bible_chapters_v3 (translationId, passageId, content) VALUES (?, ?, ?)',
          [String(translationId), ch.passageId, ch.content]
        );
      }
    });
    return true;
  } catch (error) {
    console.error(`Failed to batch save chapters for ${translationId}:`, error);
    return false;
  }
};

export const getChapter = async (translationId: string | number, passageId: string) => {
  try {
    const row = db.getFirstSync<{ content: string }>(
      'SELECT content FROM bible_chapters_v3 WHERE translationId = ? AND passageId = ?',
      [String(translationId), passageId]
    );
    return row ? row.content : null;
  } catch (error) {
    console.error(`Failed to get chapter ${passageId}:`, error);
    return null;
  }
};

export const getOfflineChapterCount = async (translationId: string | number): Promise<number> => {
  try {
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bible_chapters_v3 WHERE translationId = ?',
      [String(translationId)]
    );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
};

export const deleteOfflineBible = async (translationId: string | number) => {
  try {
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM bible_indices WHERE translationId = ?', [String(translationId)]);
      db.runSync('DELETE FROM bible_chapters_v3 WHERE translationId = ?', [String(translationId)]);
      db.runSync('DELETE FROM bible_books WHERE translationId = ?', [String(translationId)]);
      db.runSync('DELETE FROM bible_translations WHERE id = ?', [String(translationId)]);
    });
    return true;
  } catch (error) {
    console.error(`Failed to delete offline bible for ${translationId}:`, error);
    return false;
  }
};

export const isBibleOffline = async (translationId: string | number) => {
  try {
    // 1. Check if index or translation entry exists
    const hasIndex = db.getFirstSync<{ translationId: string }>(
      'SELECT translationId FROM bible_indices WHERE translationId = ?',
      [String(translationId)]
    );
    if (hasIndex) return true;

    const hasTranslation = db.getFirstSync<{ id: string }>(
      'SELECT id FROM bible_translations WHERE id = ?',
      [String(translationId)]
    );
    if (hasTranslation) return true;

    // 2. Fallback: check if chapters exist in chapter store
    const countRow = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bible_chapters_v3 WHERE translationId = ? LIMIT 1',
      [String(translationId)]
    );
    return (countRow?.count ?? 0) > 0;
  } catch {
    return false;
  }
};
