import * as z from 'zod'
import { PATHS } from '../routes'
import { AppNotification, AppNotificationType } from './types.d'

const body = z.object({
    channelId: z.string(),
    spaceId: z.string(),
    threadId: z.string().optional(),
    eventId: z.string().optional(),
})

const options = z.object({
    body: body,
})

// this is obviously a bit overkill for now, but I think it can
// be helpful as we add more notification types
const notificationSchema = z
    .union([
        z.object({
            notificationType: z.literal(AppNotificationType.NewMessage),
            title: z.string(),
            options: options,
        }),
        z.object({
            notificationType: z.literal(AppNotificationType.Mention),
            title: z.string(),
            options: options,
        }),
    ])
    .transform((data): AppNotification | undefined => {
        if (data.notificationType === AppNotificationType.NewMessage) {
            return {
                title: data.title,
                spaceID: data.options.body.spaceId,
                content: {
                    notificationType: AppNotificationType.NewMessage,
                    channelID: data.options.body.channelId,
                    threadID: data.options.body.threadId,
                },
            }
        } else if (
            data.notificationType === AppNotificationType.Mention &&
            data.options.body.eventId
        ) {
            return {
                title: data.title,
                spaceID: data.options.body.spaceId,
                content: {
                    notificationType: AppNotificationType.Mention,
                    channelID: data.options.body.channelId,
                    threadID: data.options.body.threadId,
                    eventID: data.options.body.eventId,
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
    switch (notification.content.notificationType) {
        case AppNotificationType.NewMessage:
            return (
                [
                    PATHS.SPACES,
                    notification.spaceID,
                    PATHS.CHANNELS,
                    notification.content.channelID,
                ].join('/') + '/'
            )

        // this path isn't correct at the time being. let's work out IF we want to link to
        // the event, and if so, how we want to do it
        case AppNotificationType.Mention:
            return (
                [
                    PATHS.SPACES,
                    notification.spaceID,
                    PATHS.CHANNELS,
                    notification.content.channelID,
                ].join('/') + '/'
            )
    }
}
