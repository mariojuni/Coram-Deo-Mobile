import { useState, useEffect, useMemo } from 'react';
import { CloudFile } from '../../domain/files.types';
import { getFileUri } from '../../services/fileCacheService';
import { useAuthStore } from '../../../../store/useAuthStore';

export function useCachedImage(url?: string, mockFileContext?: Partial<CloudFile>) {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore((state: any) => state.user);

  // Memoize the context so it doesn't cause infinite re-renders
  const memoizedContext = useMemo(() => mockFileContext, [mockFileContext?.id, mockFileContext?.churchId, mockFileContext?.updatedAt]);

  useEffect(() => {
    let isMounted = true;

    async function fetchCache() {
      if (!url) {
        if (isMounted) setCachedUri(null);
        return;
      }

      const fileContext: CloudFile = {
        id: memoizedContext?.id || url.split('/').pop()?.split('?')[0] || 'unknown',
        churchId: memoizedContext?.churchId || 'default',
        fileName: memoizedContext?.fileName || 'image.jpg',
        originalName: (memoizedContext as any)?.originalName || 'image.jpg',
        mimeType: memoizedContext?.mimeType || 'image/jpeg',
        sizeBytes: memoizedContext?.sizeBytes || 0,
        downloadUrl: url,
        storagePath: memoizedContext?.storagePath || '',
        visibility: memoizedContext?.visibility || 'public',
        uploadedBy: (memoizedContext as any)?.uploadedBy || 'system',
        version: memoizedContext?.version || 1,
        createdAt: (memoizedContext as any)?.createdAt || new Date().toISOString(),
        updatedAt: memoizedContext?.updatedAt ? new Date(memoizedContext.updatedAt).toISOString() : new Date().toISOString(),
        ...memoizedContext
      };

      setLoading(true);
      try {
        const uri = await getFileUri(currentUser, fileContext);
        if (isMounted) {
          setCachedUri(uri);
        }
      } catch (err) {
        console.error('Failed to cache image:', err);
        // fallback to original URL
        if (isMounted) {
          setCachedUri(url);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCache();

    return () => {
      isMounted = false;
    };
  }, [url, currentUser, memoizedContext]);

  return { cachedUri: cachedUri || url, loading };
}
