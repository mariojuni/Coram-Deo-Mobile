export type CommunityMemberTabFilter = 'all' | 'prayers' | 'highlights' | 'notes';

export interface CombinedFeedItem {
  type: 'highlight' | 'prayer' | 'note';
  data: any;
  timestamp: number;
}
