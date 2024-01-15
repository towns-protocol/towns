import { StreamEvent } from '@river/proto'

export enum AppNotificationType {
    DirectMessage = 'direct_message',
    NewMessage = 'new_message',
    Mention = 'mention',
    ReplyTo = 'reply_to',
}

export type AppNotificationMessage = {
    topic?: string
    content: {
        kind: AppNotificationType.NewMessage
        spaceId: string
        channelId: string
        senderId: string
        event: StreamEvent
    }
}

export type AppNotificationMention = {
    topic?: string
    content: {
        kind: AppNotificationType.Mention
        spaceId: string
        channelId: string
        senderId: string
        event: StreamEvent
    }
}

export type AppNotificationReplyTo = {
    topic?: string
    content: {
        kind: AppNotificationType.ReplyTo
        spaceId: string
        channelId: string
        senderId: string
        event: StreamEvent
    }
}

export type AppNotificationDM = {
    topic?: string
    content: {
        kind: AppNotificationType.DirectMessage
        channelId: string
        senderId: string
        recipients: string[]
        event: StreamEvent
    }
}

export type AppNotification =
    | AppNotificationDM
    | AppNotificationMessage
    | AppNotificationMention
    | AppNotificationReplyTo

export type NotificationNewMessage = {
    kind: AppNotificationType.NewMessage
    spaceId: string
    channelId: string
    title: string
    body: string
}

export type NotificationMention = {
    kind: AppNotificationType.Mention
    spaceId: string
    channelId: string
    threadId?: string
    title: string
    body: string
}

export type NotificationReplyTo = {
    kind: AppNotificationType.ReplyTo
    spaceId: string
    channelId: string
    threadId: string
    title: string
    body: string
}

export type NotificationDM = {
    kind: AppNotificationType.DirectMessage
    channelId: string
    title: string
    body: string
}

export type NotificationContent =
    | NotificationDM
    | NotificationNewMessage
    | NotificationMention
    | NotificationReplyTo

export const WEB_PUSH_NAVIGATION_CHANNEL = 'web-push-navigation-channel'

export interface User {
    userId: string
    username: string
    displayName: string
}
