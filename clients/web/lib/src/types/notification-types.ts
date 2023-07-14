export enum NotificationType {
    Mention = 'mention',
    NewMessage = 'new_message',
}

export interface MentionNotificationContent {
    spaceId: string
    channelId: string
}

export interface NewMessageNotificationContent {
    spaceId: string
    channelId: string
    senderId: string
}

export type NotificationContent = MentionNotificationContent | NewMessageNotificationContent

export interface NotificationPayload {
    notificationType: NotificationType
    content: NotificationContent
}

export interface NotificationRequestParams {
    topic: string
    payload: NotificationPayload
    sender: string
    users: string[]
}
