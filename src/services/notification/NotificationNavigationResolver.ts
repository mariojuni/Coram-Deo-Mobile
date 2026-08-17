import { AppNotification } from './NotificationRepository';

export class NotificationNavigationResolver {
  /**
   * Resolves a notification into a path and params for Expo Router.
   */
  static resolveDestination(notification: AppNotification): { pathname: string; params?: any } | null {
    // If the backend already provided a navigation object, we prefer that.
    if (notification.navigation?.destination) {
      return {
        pathname: notification.navigation.destination,
        params: notification.navigation.params,
      };
    }

    const { category, sourceId } = notification;

    // Use default logic based on category and sourceId
    switch (category) {
      case 'prayer':
        if (sourceId) {
          return {
            pathname: '/comment-thread',
            params: { targetType: 'prayer_request', targetId: sourceId },
          };
        }
        return { pathname: '/(tabs)/prayer' };

      case 'serve':
        return { pathname: '/(tabs)/serve' };

      case 'event':
        // The event modal usually doesn't have a direct deep link screen, 
        // but maybe we can route to community events tab
        return { pathname: '/(tabs)/community', params: { tab: 'events', highlightId: sourceId } };

      case 'discipleship':
        if (sourceId) {
          return {
            pathname: '/discipleship/group/[groupId]', // Example path
            params: { groupId: sourceId },
          };
        }
        return null;

      case 'worship':
        if (sourceId) {
          return {
            pathname: '/worship-setlist-detail',
            params: { id: sourceId },
          };
        }
        return null;

      case 'giving':
        if (notification.sourceType === 'giving_pending') {
          return { pathname: '/staff-finance/pending-verification' };
        }
        return { pathname: '/my-giving' };

      case 'announcement':
        return { pathname: '/(tabs)/community', params: { tab: 'announcements' } };

      case 'sermon':
        if (sourceId) {
          return { pathname: '/sermon-detail', params: { id: sourceId } };
        }
        return { pathname: '/(tabs)/sermons' };

      case 'social':
        if (sourceId && notification.sourceType) {
          return {
            pathname: '/comment-thread',
            params: { targetType: notification.sourceType, targetId: sourceId },
          };
        }
        return null;

      case 'system':
      default:
        return null;
    }
  }
}
