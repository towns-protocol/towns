export enum AppNotificationType {
    NewMessage = 'new_message',
    Mention = 'mention',
}

export type AppNotificationMessage = {
    notificationType: AppNotificationType.NewMessage
    channelID: string
    threadID?: string
}

export type AppNotificationMention = {
    notificationType: AppNotificationType.Mention
    channelID: string
    eventID: string
    threadID?: string
}

export type AppNotification = {
    spaceID: string
    title: string
    content: AppNotificationMessage | AppNotificationMention
}

export const WEB_PUSH_NAVIGATION_CHANNEL = 'web-push-navigation-channel'
