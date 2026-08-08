import * as SQLite from 'expo-sqlite';

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
  `);
};

// Initialize DB immediately when module loads
initDB();

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

export const deleteOfflineBible = async (translationId: string | number) => {
  try {
    db.runSync('DELETE FROM bible_indices WHERE translationId = ?', [String(translationId)]);
    db.runSync('DELETE FROM bible_chapters_v3 WHERE translationId = ?', [String(translationId)]);
    return true;
  } catch (error) {
    console.error(`Failed to delete offline bible for ${translationId}:`, error);
    return false;
  }
};

export const isBibleOffline = async (translationId: string | number) => {
  try {
    const row = db.getFirstSync<{ translationId: string }>(
      'SELECT translationId FROM bible_indices WHERE translationId = ?',
      [String(translationId)]
    );
    return !!row;
  } catch {
    return false;
  }
};
