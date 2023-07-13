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
        notificationType: z.enum([AppNotificationType.NewMessage, AppNotificationType.Mention]),
        content: content,
        topic: z.string().optional(),
    })
    .transform((data): AppNotification | undefined => {
        if (data.notificationType === AppNotificationType.NewMessage) {
            return {
                topic: data.topic,
                notificationType: AppNotificationType.NewMessage,
                content: {
                    spaceId: data.content.spaceId,
                    channelId: data.content.channelId,
                    senderId: data.content.senderId,
                },
            }
        } else if (data.notificationType === AppNotificationType.Mention) {
            return {
                topic: data.topic,
                notificationType: AppNotificationType.Mention,
                content: {
                    spaceId: data.content.spaceId,
                    channelId: data.content.channelId,
                    senderId: data.content.senderId,
                },
            }
        }
        return undefined
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

        // this path isn't correct at the time being. let's work out IF we want to link to
        // the event, and if so, how we want to do it
        case AppNotificationType.Mention:
            return (
                [
                    PATHS.SPACES,
                    encodeURIComponent(notification.content.spaceId),
                    PATHS.CHANNELS,
                    encodeURIComponent(notification.content.channelId),
                ].join('/') + '/'
            )
        default:
            return '/'
    }
}
