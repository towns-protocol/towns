import * as z from 'zod'
import { StreamEvent } from '@river-build/proto'
import { PATHS } from '../routes'
import {
    AppNotification,
    AppNotificationType,
    NotificationAttachmentKind,
    NotificationContent,
} from './types.d'

const payloadMessage = z.object({
    kind: z.enum([
        AppNotificationType.NewMessage,
        AppNotificationType.Mention,
        AppNotificationType.ReplyTo,
    ]),
    spaceId: z.string(),
    channelId: z.string(),
    senderId: z.string(),
    event: z.unknown(),
    attachmentOnly: z.nativeEnum(NotificationAttachmentKind).optional(),
    reaction: z.boolean().optional(),
})

const payloadDm = z.object({
    kind: z.enum([AppNotificationType.DirectMessage]),
    channelId: z.string(),
    senderId: z.string(),
    recipients: z.array(z.string()),
    event: z.unknown(),
    attachmentOnly: z.nativeEnum(NotificationAttachmentKind).optional(),
    reaction: z.boolean().optional(),
})

const payload = z.discriminatedUnion('kind', [payloadMessage, payloadDm])

// this is obviously a bit overkill for now, but I think it can
// be helpful as we add more notification types
const payloadSchema = z
    .object({
        content: payload,
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
                        attachmentOnly: data.content.attachmentOnly,
                        reaction: data.content.reaction,
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
                        attachmentOnly: data.content.attachmentOnly,
                        reaction: data.content.reaction,
                    },
                }
            default:
                return undefined
        }
    })

export function appNotificationFromPushEvent(raw: string): AppNotification | undefined {
    const json = JSON.parse(raw)
    const parsed = payloadSchema.safeParse(json)

    if (!parsed.success) {
        console.error(parsed.error)
        return undefined
    }

    return parsed.data
}

const plaintextMessage = z.object({
    kind: z.enum([AppNotificationType.NewMessage, AppNotificationType.Mention]),
    spaceId: z.string(),
    channelId: z.string(),
    threadId: z.string().optional(),
    title: z.string(),
    body: z.string(),
})

const plaintextReplyToMessage = z.object({
    kind: z.enum([AppNotificationType.ReplyTo]),
    spaceId: z.string(),
    channelId: z.string(),
    threadId: z.string(),
    title: z.string(),
    body: z.string(),
})

const plaintextDm = z.object({
    kind: z.enum([AppNotificationType.DirectMessage]),
    channelId: z.string(),
    title: z.string(),
    body: z.string(),
})

const plaintextSchema = z
    .discriminatedUnion('kind', [plaintextMessage, plaintextReplyToMessage, plaintextDm])
    .transform((data): NotificationContent | undefined => {
        switch (data.kind) {
            case AppNotificationType.DirectMessage:
                return {
                    kind: AppNotificationType.DirectMessage,
                    channelId: data.channelId,
                    title: data.title,
                    body: data.body,
                }
            case AppNotificationType.NewMessage:
                return {
                    kind: AppNotificationType.NewMessage,
                    spaceId: data.spaceId,
                    channelId: data.channelId,
                    title: data.title,
                    body: data.body,
                }
            case AppNotificationType.Mention:
                return {
                    kind: AppNotificationType.Mention,
                    spaceId: data.spaceId,
                    channelId: data.channelId,
                    threadId: data.threadId,
                    title: data.title,
                    body: data.body,
                }
            case AppNotificationType.ReplyTo:
                return {
                    kind: AppNotificationType.ReplyTo,
                    spaceId: data.spaceId ?? '',
                    channelId: data.channelId,
                    threadId: data.threadId,
                    title: data.title,
                    body: data.body,
                }
            default:
                return undefined
        }
    })

export function notificationContentFromEvent(raw: string): NotificationContent | undefined {
    console.log('sw:push:notificationContentFromEvent', 'raw', raw)
    try {
        const json = JSON.parse(raw)
        const parsed = plaintextSchema.safeParse(json)

        if (!parsed.success) {
            console.error(parsed.error)
            return undefined
        }

        return parsed.data
    } catch (error) {
        console.error('sw:push:notificationContentFromEvent', error)
        return undefined
    }
}

export function pathFromAppNotification(notification: NotificationContent) {
    switch (notification.kind) {
        case AppNotificationType.DirectMessage:
            return [PATHS.MESSAGES, encodeURIComponent(notification.channelId)].join('/') + '/'
        case AppNotificationType.NewMessage:
            return [
                PATHS.SPACES,
                encodeURIComponent(notification.spaceId),
                PATHS.CHANNELS,
                encodeURIComponent(notification.channelId),
            ].join('/')
        case AppNotificationType.Mention:
            if (notification.threadId) {
                return [
                    PATHS.SPACES,
                    encodeURIComponent(notification.spaceId),
                    PATHS.CHANNELS,
                    encodeURIComponent(notification.channelId),
                    PATHS.REPLIES,
                    encodeURIComponent(notification.threadId),
                ].join('/')
            }
            return [
                PATHS.SPACES,
                encodeURIComponent(notification.spaceId),
                PATHS.CHANNELS,
                encodeURIComponent(notification.channelId),
            ].join('/')
        case AppNotificationType.ReplyTo:
            if (notification.threadId) {
                return [
                    PATHS.SPACES,
                    encodeURIComponent(notification.spaceId),
                    PATHS.CHANNELS,
                    encodeURIComponent(notification.channelId),
                    PATHS.REPLIES,
                    encodeURIComponent(notification.threadId),
                ].join('/')
            }
            return [
                PATHS.SPACES,
                encodeURIComponent(notification.spaceId),
                PATHS.CHANNELS,
                encodeURIComponent(notification.channelId),
            ].join('/')
        default:
            return '/'
    }
}
