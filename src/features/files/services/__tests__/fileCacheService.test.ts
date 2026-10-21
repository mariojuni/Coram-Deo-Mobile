import {
  initCacheDir,
  getFileUri,
  clearSensitiveCache,
  clearChurchCache,
} from '../fileCacheService';
import * as FileSystem from 'expo-file-system/legacy';
import { canAccessCloudFile, isSensitiveFile } from '@/permissions/filePermissions';

jest.mock('@/permissions/filePermissions', () => ({
  canAccessCloudFile: jest.fn(),
  isSensitiveFile: jest.fn(),
}));

describe('fileCacheService', () => {
  const mockGetInfoAsync = FileSystem.getInfoAsync as jest.Mock;
  const mockMakeDirectoryAsync = FileSystem.makeDirectoryAsync as jest.Mock;
  const mockDownloadAsync = FileSystem.downloadAsync as jest.Mock;
  const mockReadDirectoryAsync = FileSystem.readDirectoryAsync as jest.Mock;
  const mockDeleteAsync = FileSystem.deleteAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initCacheDir', () => {
    it('creates directory when cache dir does not exist', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({ exists: false });

      await initCacheDir();

      expect(mockMakeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('churchapp_files/'),
        { intermediates: true }
      );
    });

    it('does not re-create directory if it already exists', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });

      await initCacheDir();

      expect(mockMakeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('getFileUri', () => {
    const mockUser = { uid: 'u1', churchId: 'church_1' } as any;
    const mockFile = {
      id: 'f1',
      churchId: 'church_1',
      fileName: 'budget.pdf',
      version: 1,
      downloadUrl: 'https://storage.googleapis.com/budget.pdf',
    } as any;

    it('throws error when user is unauthorized', async () => {
      (canAccessCloudFile as jest.Mock).mockReturnValueOnce(false);

      await expect(getFileUri(mockUser, mockFile)).rejects.toThrow(
        'Unauthorized to access this file'
      );
    });

    it('returns localUri directly if file is already cached', async () => {
      (canAccessCloudFile as jest.Mock).mockReturnValueOnce(true);
      (isSensitiveFile as jest.Mock).mockReturnValueOnce(false);
      // initCacheDir check:
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      // file check:
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });

      const uri = await getFileUri(mockUser, mockFile);

      expect(uri).toContain('church_1_f1_1.pdf');
      expect(mockDownloadAsync).not.toHaveBeenCalled();
    });

    it('downloads and returns cached uri when file is not yet cached', async () => {
      (canAccessCloudFile as jest.Mock).mockReturnValueOnce(true);
      (isSensitiveFile as jest.Mock).mockReturnValueOnce(false);
      // initCacheDir check:
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      // file check:
      mockGetInfoAsync.mockResolvedValueOnce({ exists: false });
      mockDownloadAsync.mockResolvedValueOnce({ uri: 'file:///cache/churchapp_files/church_1_f1_1.pdf' });

      const uri = await getFileUri(mockUser, mockFile);

      expect(mockDownloadAsync).toHaveBeenCalledWith(
        'https://storage.googleapis.com/budget.pdf',
        expect.stringContaining('church_1_f1_1.pdf')
      );
      expect(uri).toBe('file:///cache/churchapp_files/church_1_f1_1.pdf');
    });

    it('throws error if file has no downloadUrl and is not cached', async () => {
      (canAccessCloudFile as jest.Mock).mockReturnValueOnce(true);
      (isSensitiveFile as jest.Mock).mockReturnValueOnce(false);
      // initCacheDir:
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      // file check:
      mockGetInfoAsync.mockResolvedValueOnce({ exists: false });

      const fileWithoutUrl = { ...mockFile, downloadUrl: undefined };
      await expect(getFileUri(mockUser, fileWithoutUrl)).rejects.toThrow(
        'No download URL provided for file'
      );
    });
  });

  describe('clearSensitiveCache & clearChurchCache', () => {
    it('deletes only files tagged with _sensitive_', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      mockReadDirectoryAsync.mockResolvedValueOnce([
        'church1_f1_sensitive_hash.pdf',
        'church1_f2_normal.pdf',
        'church2_f3_sensitive_hash.pdf',
      ]);

      await clearSensitiveCache();

      expect(mockDeleteAsync).toHaveBeenCalledTimes(2);
      expect(mockDeleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('church1_f1_sensitive_hash.pdf'),
        { idempotent: true }
      );
      expect(mockDeleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('church2_f3_sensitive_hash.pdf'),
        { idempotent: true }
      );
    });

    it('deletes only files for the specified churchId', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
      mockReadDirectoryAsync.mockResolvedValueOnce([
        'church1_f1_hash.pdf',
        'church1_f2_hash.pdf',
        'church2_f3_hash.pdf',
      ]);

      await clearChurchCache('church1');

      expect(mockDeleteAsync).toHaveBeenCalledTimes(2);
      expect(mockDeleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('church1_f1_hash.pdf'),
        { idempotent: true }
      );
    });
  });
});
