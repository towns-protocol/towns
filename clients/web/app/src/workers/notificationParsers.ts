import * as z from 'zod'
import { PATHS } from 'routes'
import { AppNotification, AppNotificationType } from './types.d'

// this is obviously a bit overkill for now, but I think it can
// be helpful as we add more notification types
const notificationSchema = z
    .union([
        z.object({
            notification_type: z.literal(AppNotificationType.NewMessage),
            space_id: z.string(),
            channel_id: z.string(),
            thread_id: z.string().optional(),
        }),
        z.object({
            notification_type: z.literal(AppNotificationType.Mention),
            space_id: z.string(),
            channel_id: z.string(),
            thread_id: z.string().optional(),
            event_id: z.string(),
        }),
    ])
    .transform((data): AppNotification | undefined => {
        if (data.notification_type === AppNotificationType.NewMessage) {
            return {
                spaceID: data.space_id,
                content: {
                    notificationType: AppNotificationType.NewMessage,
                    channelID: data.channel_id,
                    threadID: data.thread_id,
                },
            }
        } else if (data.notification_type === AppNotificationType.Mention) {
            return {
                spaceID: data.space_id,
                content: {
                    notificationType: AppNotificationType.Mention,
                    channelID: data.channel_id,
                    threadID: data.thread_id,
                    eventID: data.event_id,
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
