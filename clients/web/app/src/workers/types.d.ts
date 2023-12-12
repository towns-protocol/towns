export enum AppNotificationType {
    DirectMessage = 'direct_message',
    NewMessage = 'new_message',
    Mention = 'mention',
    ReplyTo = 'reply_to',
}

export type AppNotificationMessage = {
    notificationType: AppNotificationType.NewMessage
    topic?: string
    content: {
        spaceId: string
        channelId: string
        senderId: string
    }
}

export type AppNotificationMention = {
    notificationType: AppNotificationType.Mention
    topic?: string
    content: {
        spaceId: string
        channelId: string
        senderId: string
    }
}

export type AppNotificationReplyTo = {
    notificationType: AppNotificationType.ReplyTo
    topic?: string
    content: {
        spaceId: string
        channelId: string
        senderId: string
    }
}

export type AppNotificationDM = {
    notificationType: AppNotificationType.DirectMessage
    topic?: string
    content: {
        spaceId: string
        channelId: string
        senderId: string
        recipients: string[]
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
}
