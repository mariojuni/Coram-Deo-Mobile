import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { UserAccount } from '../../auth/domain/auth.types';
import { CloudFile } from '../domain/files.types';
import { canAccessCloudFile, isSensitiveFile } from '../../../permissions/filePermissions';

const CACHE_DIR = (Paths.cache.uri.endsWith('/') ? Paths.cache.uri : Paths.cache.uri + '/') + 'churchapp_files/';

export const initCacheDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
};

export const getFileUri = async (user: UserAccount | null | undefined, file: CloudFile): Promise<string> => {
  // 1-4. Permission check flow
  if (!canAccessCloudFile(user, file)) {
    throw new Error('Unauthorized to access this file');
  }

  await initCacheDir();

  // 5. Check local cache
  const safeHash = file.contentHash || file.version.toString();
  const fileExt = file.fileName.split('.').pop() || 'tmp';
  const sensitiveTag = isSensitiveFile(file) ? '_sensitive_' : '_';
  
  // Tag the churchId in the filename to easily clear by church
  const localFileName = `${file.churchId}_${file.id}${sensitiveTag}${safeHash}.${fileExt}`;
  const localUri = CACHE_DIR + localFileName;

  const fileInfo = await FileSystem.getInfoAsync(localUri);

  // 6. Return local URI if cached and valid
  if (fileInfo.exists) {
    return localUri;
  }

  // 7. Download and cache
  if (!file.downloadUrl) {
    throw new Error('No download URL provided for file');
  }

  const downloadResult = await FileSystem.downloadAsync(file.downloadUrl, localUri);
  return downloadResult.uri;
};

export const clearSensitiveCache = async () => {
  await initCacheDir();
  const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
  
  for (const fileName of files) {
    if (fileName.includes('_sensitive_')) {
      await FileSystem.deleteAsync(CACHE_DIR + fileName, { idempotent: true });
    }
  }
};

export const clearChurchCache = async (churchId: string) => {
  await initCacheDir();
  const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
  
  for (const fileName of files) {
    if (fileName.startsWith(`${churchId}_`)) {
      await FileSystem.deleteAsync(CACHE_DIR + fileName, { idempotent: true });
    }
  }
};
