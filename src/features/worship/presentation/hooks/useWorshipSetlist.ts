import { useState, useEffect } from 'react';
import { worshipRepository } from '../../data/worship.repository';
import { WorshipSetlist, WorshipSetlistItem } from '../../domain/worship.types';
import { useWorshipStore } from '../../../../store/useWorshipStore';

export const useWorshipSetlist = (churchId?: string, eventId?: string) => {
  const [setlist, setSetlist] = useState<WorshipSetlist | null>(null);
  const [items, setItems] = useState<WorshipSetlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { setActiveSetlistItems } = useWorshipStore();

  useEffect(() => {
    let unsubscribeSetlist: (() => void) | null = null;
    let unsubscribeItems: (() => void) | null = null;
    let isMounted = true;

    if (!churchId || !eventId) {
      setSetlist(null);
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    unsubscribeSetlist = worshipRepository.subscribeToSetlistForEvent(
      churchId,
      eventId,
      (fetchedSetlist) => {
        if (!isMounted) return;
        setSetlist(fetchedSetlist);

        if (fetchedSetlist) {
          // If we already had an items listener, clean it up before creating a new one
          if (unsubscribeItems) {
            unsubscribeItems();
          }
          unsubscribeItems = worshipRepository.subscribeToSetlistItems(
            churchId,
            fetchedSetlist.id,
            (fetchedItems) => {
              if (isMounted) {
                setItems(fetchedItems);
                setActiveSetlistItems(fetchedItems);
                setLoading(false);
              }
            },
            (err) => {
              if (isMounted) {
                setError(err instanceof Error ? err : new Error('Failed to fetch setlist items'));
                setLoading(false);
              }
            }
          );
        } else {
          setItems([]);
          setActiveSetlistItems([]);
          setLoading(false);
        }
      },
      (err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch setlist'));
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      if (unsubscribeSetlist) unsubscribeSetlist();
      if (unsubscribeItems) unsubscribeItems();
    };
  }, [churchId, eventId]);

  return { setlist, items, loading, error };
};
