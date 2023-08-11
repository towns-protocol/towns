import * as z from 'zod'
import { PATHS } from '../routes'
import { AppNotification, AppNotificationType } from './types.d'

const content = z.object({
    spaceId: z.string(),
    channelId: z.string(),
    senderId: z.string(),
})

// this is obviously a bit overkill for now, but I think it can
// be helpful as we add more notification types
const notificationSchema = z
    .object({
        notificationType: z.enum([
            AppNotificationType.NewMessage,
            AppNotificationType.Mention,
            AppNotificationType.ReplyTo,
        ]),
        content: content,
        topic: z.string().optional(),
    })
    .transform((data): AppNotification | undefined => {
        switch (data.notificationType) {
            case AppNotificationType.NewMessage:
                return {
                    topic: data.topic,
                    notificationType: AppNotificationType.NewMessage,
                    content: {
                        spaceId: data.content.spaceId,
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                    },
                }
            case AppNotificationType.Mention:
                return {
                    topic: data.topic,
                    notificationType: AppNotificationType.Mention,
                    content: {
                        spaceId: data.content.spaceId,
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                    },
                }
            case AppNotificationType.ReplyTo:
                return {
                    topic: data.topic,
                    notificationType: AppNotificationType.ReplyTo,
                    content: {
                        spaceId: data.content.spaceId,
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                    },
                }
            default:
                return undefined
        }
    })

export function appNotificationFromPushEvent(raw: string): AppNotification | undefined {
    const json = JSON.parse(raw)
    const parsed = notificationSchema.safeParse(json)

    if (!parsed.success) {
        console.error(parsed.error)
        return undefined
    }

    return parsed.data
}

export function pathFromAppNotification(notification: AppNotification) {
    switch (notification.notificationType) {
        case AppNotificationType.NewMessage:
            return (
                [
                    PATHS.SPACES,
                    encodeURIComponent(notification.content.spaceId),
                    PATHS.CHANNELS,
                    encodeURIComponent(notification.content.channelId),
                ].join('/') + '/'
            )
        case AppNotificationType.Mention:
            return (
                [
                    PATHS.SPACES,
                    encodeURIComponent(notification.content.spaceId),
                    PATHS.MENTIONS,
                ].join('/') + '/'
            )
        case AppNotificationType.ReplyTo:
            return (
                [
                    PATHS.SPACES,
                    encodeURIComponent(notification.content.spaceId),
                    PATHS.THREADS,
                ].join('/') + '/'
            )
        default:
            return '/'
    }
}
