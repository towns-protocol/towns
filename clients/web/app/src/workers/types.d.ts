import { NotificationAttachmentKind } from '@notification-service/types'
import { StreamEvent } from '@river-build/proto'

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
        attachmentOnly?: NotificationAttachmentKind
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
        attachmentOnly?: NotificationAttachmentKind
        reaction?: boolean
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
        attachmentOnly?: NotificationAttachmentKind
        reaction?: boolean
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
    refEventId?: string
}

export type NotificationMention = {
    kind: AppNotificationType.Mention
    spaceId: string
    channelId: string
    threadId?: string
    title: string
    body: string
    refEventId?: string
}

export type NotificationReplyTo = {
    kind: AppNotificationType.ReplyTo
    spaceId: string
    channelId: string
    threadId: string
    title: string
    body: string
    refEventId?: string
}

export type NotificationDM = {
    kind: AppNotificationType.DirectMessage
    channelId: string
    title: string
    body: string
    refEventId?: string
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

export enum NotificationAttachmentKind {
    Image = 'image',
    Gif = 'gif',
    File = 'file',
}
