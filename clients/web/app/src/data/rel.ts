import { AppNotificationType } from 'workers/types.d'

// linked resource attributes
export const LINKED_RESOURCE = 'rel'
export const LINKED_NOTIFICATION_NAME = 'notification'
export const LINKED_NOTIFICATION_REL_ENTRY = 'notificationEntry'
export const LINKED_NOTIFICATION_KIND = 'notificationKind'

export enum NotificationRelEntry {
    OpenWindow = 'open_window',
    BroadcastChannel = 'broadcast_channel',
}

export function getUrlWithParams(
    url: URL,
    path: string,
    relEntry: NotificationRelEntry,
    notificationKind: AppNotificationType,
): URL {
    url.pathname = path
    url.searchParams.set(LINKED_RESOURCE, LINKED_NOTIFICATION_NAME)
    url.searchParams.set(LINKED_NOTIFICATION_REL_ENTRY, relEntry)
    url.searchParams.set(LINKED_NOTIFICATION_KIND, notificationKind)
    return url
}

export function getPathnameWithParams(
    url: URL,
    path: string,
    relEntry: NotificationRelEntry,
    notificationKind: AppNotificationType,
): string {
    url.pathname = path
    url.searchParams.set(LINKED_RESOURCE, LINKED_NOTIFICATION_NAME)
    url.searchParams.set(LINKED_NOTIFICATION_REL_ENTRY, relEntry)
    url.searchParams.set(LINKED_NOTIFICATION_KIND, notificationKind)
    return url.pathname + url.search
}
