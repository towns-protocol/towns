export enum AppNotificationType {
    NewMessage = 'new_message',
    Mention = 'mention',
}

export type AppNotificationMessage = {
    notificationType: AppNotificationType.NewMessage
    topic?: string
    content: {
        spaceId: string
        channelId: string
        senderId?: string
    }
}

export type AppNotificationMention = {
    notificationType: AppNotificationType.Mention
    topic?: string
    content: {
        spaceId: string
        channelId: string
        senderId?: string
    }
}

export type AppNotification = AppNotificationMessage | AppNotificationMention

export const WEB_PUSH_NAVIGATION_CHANNEL = 'web-push-navigation-channel'

export enum ServiceWorkerMessageType {
    SpaceMetadata = 'space_metadata',
    SpaceMembers = 'space_members',
}
