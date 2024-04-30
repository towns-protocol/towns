import { AppNotificationType } from 'workers/types.d'

// linked resource attributes
export const LINKED_RESOURCE = 'rel'
export const LINKED_NOTIFICATION_KIND = 'notificationKind'

export enum NotificationRel {
    OpenWindow = 'open_window',
    BroadcastChannel = 'broadcast_channel',
}

export function getUrlWithParams(
    url: URL,
    path: string,
    rel: NotificationRel,
    notificationKind: AppNotificationType,
): URL {
    url.pathname = path
    url.searchParams.set(LINKED_RESOURCE, rel)
    url.searchParams.set(LINKED_NOTIFICATION_KIND, notificationKind)
    return url
}

export function getPathnameWithParams(
    url: URL,
    path: string,
    rel: NotificationRel,
    notificationKind: AppNotificationType,
): string {
    url.pathname = path
    url.searchParams.set(LINKED_RESOURCE, rel)
    url.searchParams.set(LINKED_NOTIFICATION_KIND, notificationKind)
    return url.pathname + url.search
}
