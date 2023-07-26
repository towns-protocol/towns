export enum NotificationType {
    Mention = 'mention',
    NewMessage = 'new_message',
}

export interface NewMessageNotificationContent {
    townId: string
    channelId: string
    senderId: string
}

export type NotificationContent = NewMessageNotificationContent // | add other content types here

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

export interface MentionUsersRequestParams {
    townId: string
    channelId: string
    userIds: string[]
}

export interface ReplyToUsersRequestParams {
    townId: string
    channelId: string
    userIds: string[]
}
