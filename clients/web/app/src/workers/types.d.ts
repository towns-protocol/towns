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

export const WEB_PUSH_NAVIGATION_CHANNEL = 'web-push-navigation-channel'

export enum ServiceWorkerMessageType {
    SpaceMetadata = 'space_metadata',
    SpaceMembers = 'space_members',
    MyUserId = 'my_user_id',
}
