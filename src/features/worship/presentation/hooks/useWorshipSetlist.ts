import { useState, useEffect } from 'react';
import { worshipRepository } from '../../data/worship.repository';
import { WorshipSetlist, WorshipSetlistItem } from '../../domain/worship.types';

export const useWorshipSetlist = (churchId?: string, eventId?: string) => {
  const [setlist, setSetlist] = useState<WorshipSetlist | null>(null);
  const [items, setItems] = useState<WorshipSetlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSetlistData = async () => {
      if (!churchId || !eventId) {
        if (isMounted) {
          setSetlist(null);
          setItems([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchedSetlist = await worshipRepository.getSetlistForEvent(churchId, eventId);
        
        if (isMounted) {
          setSetlist(fetchedSetlist);
        }

        if (fetchedSetlist && isMounted) {
          const fetchedItems = await worshipRepository.getSetlistItems(fetchedSetlist.id);
          if (isMounted) {
            setItems(fetchedItems);
          }
        } else if (isMounted) {
          setItems([]);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch setlist'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSetlistData();

    return () => {
      isMounted = false;
    };
  }, [churchId, eventId]);

  return { setlist, items, loading, error };
};
