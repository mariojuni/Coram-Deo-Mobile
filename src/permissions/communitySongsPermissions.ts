import type { UserAccount } from '../features/auth/domain/auth.types';
import type { Song } from '../features/worship/domain/worship.types';

/**
 * Checks if the user is authorized to view the Community Songs Directory.
 * Open for all active users.
 */
export function canViewCommunitySongs(user?: UserAccount | null): boolean {
  if (!user) return true;
  if (user.status === 'disabled') return false;
  return true;
}

/**
 * Checks if a specific song is visible in the Community Songs Directory.
 * Requirements:
 * - Song belongs to user's churchId (if user has churchId)
 * - Song status is 'published', 'active', or undefined
 * - Song directoryVisibility is 'members_only', 'public', or undefined
 */
export function canViewSongInDirectory(user: UserAccount | null | undefined, song?: Song | null): boolean {
  if (!song) return false;
  if (user?.status === 'disabled') return false;
  if (user?.churchId && song.churchId && song.churchId !== user.churchId) return false;

  const isPublished = song.status === 'published' || song.status === 'active' || !song.status;
  const isVisible = song.directoryVisibility === 'members_only' || song.directoryVisibility === 'public' || !song.directoryVisibility;

  return isPublished && isVisible;
}

/**
 * Checks if lyrics should be rendered in the Community Songs Directory.
 * Returns true ONLY if allowLyricsInDirectory is explicitly enabled by church leaders.
 */
export function canViewLyricsInDirectory(song?: Song | null): boolean {
  if (!song) return false;
  return Boolean(song.allowLyricsInDirectory || song.allowPublicLyrics);
}

/**
 * Chords are NEVER exposed through the Community Songs Directory.
 * Chords are accessible only through Serve/My Schedule worship assignment duties.
 */
export function canViewChordsInCommunity(): boolean {
  return false;
}
