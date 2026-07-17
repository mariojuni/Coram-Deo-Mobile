import type { Prayer, PrayerFilter } from './prayer.types';

function normalizeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    if ('toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    // Handle serialized Firestore timestamps
    if ('seconds' in value || '_seconds' in value) {
      const seconds = value.seconds || value._seconds;
      if (typeof seconds === 'number') {
        return new Date(seconds * 1000);
      }
    }
  }
  return null;
}

export function formatPrayerTimeAgo(timestamp: Prayer['createdAt']): string {
  const date = normalizeDate(timestamp);
  if (!date) return 'Just now';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function getFilteredPrayers(
  prayers: Prayer[],
  search: string,
  filter: PrayerFilter,
  currentUserId?: string
): Prayer[] {
  const normalizedSearch = search.toLowerCase();

  return prayers.filter((prayer) => {
    const matchesSearch =
      (prayer.request?.toLowerCase() || '').includes(normalizedSearch) ||
      (prayer.name?.toLowerCase() || '').includes(normalizedSearch);

    if (!matchesSearch) return false;

    if (filter === 'My Requests') {
      return prayer.userId === currentUserId;
    }

    if (filter === 'Answered') {
      return prayer.answered;
    }

    return true;
  });
}

