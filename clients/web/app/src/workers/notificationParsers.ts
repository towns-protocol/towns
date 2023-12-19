import * as z from 'zod'
import { StreamEvent } from '@river/proto'
import { PATHS } from '../routes'
import { AppNotification, AppNotificationType } from './types.d'

const contentMessage = z.object({
    kind: z.enum([
        AppNotificationType.NewMessage,
        AppNotificationType.Mention,
        AppNotificationType.ReplyTo,
    ]),
    spaceId: z.string(),
    channelId: z.string(),
    senderId: z.string(),
    event: z.unknown(),
})

const contentDm = z.object({
    kind: z.enum([AppNotificationType.DirectMessage]),
    channelId: z.string(),
    senderId: z.string(),
    recipients: z.array(z.string()),
    event: z.unknown(),
})

const content = z.discriminatedUnion('kind', [contentMessage, contentDm])

// this is obviously a bit overkill for now, but I think it can
// be helpful as we add more notification types
const notificationSchema = z
    .object({
        content: content,
        topic: z.string().optional(),
    })
    .transform((data): AppNotification | undefined => {
        switch (data.content.kind) {
            case AppNotificationType.DirectMessage:
                return {
                    topic: data.topic,
                    content: {
                        kind: AppNotificationType.DirectMessage,
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                        recipients: data.content.recipients ?? [],
                        event: data.content.event as StreamEvent,
                    },
                }
            case AppNotificationType.NewMessage:
                return {
                    topic: data.topic,
                    content: {
                        kind: AppNotificationType.NewMessage,
                        spaceId: data.content.spaceId ?? '',
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                        event: data.content.event as StreamEvent,
                    },
                }
            case AppNotificationType.Mention:
                return {
                    topic: data.topic,
                    content: {
                        kind: AppNotificationType.Mention,
                        spaceId: data.content.spaceId ?? '',
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                        event: data.content.event as StreamEvent,
                    },
                }
            case AppNotificationType.ReplyTo:
                return {
                    topic: data.topic,
                    content: {
                        kind: AppNotificationType.ReplyTo,
                        spaceId: data.content.spaceId ?? '',
                        channelId: data.content.channelId,
                        senderId: data.content.senderId,
                        event: data.content.event as StreamEvent,
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
    switch (notification.content.kind) {
        case AppNotificationType.DirectMessage:
            return (
                [PATHS.MESSAGES, encodeURIComponent(notification.content.channelId)].join('/') + '/'
            )
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
