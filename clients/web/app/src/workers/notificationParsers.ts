import * as z from 'zod'
import { StreamEventSchema } from '@towns-protocol/proto'
import { bin_fromHexString } from '@towns-protocol/dlog'
import {
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    spaceIdFromChannelId,
} from '@towns-protocol/sdk'
import { fromBinary } from '@bufbuild/protobuf'
import { NotificationClicked } from 'store/notificationCurrentUser'
import { PATHS } from '../routes'
import { AppNotification, NotificationContent, NotificationKind } from './types.d'

const payload = z.object({
    kind: z.nativeEnum(NotificationKind),
    spaceId: z.string().optional(),
    channelId: z.string(),
    threadId: z.string().optional(),
    senderId: z.string(),
    recipients: z.array(z.string()).optional(),
    event: z.string().optional(),
})

// this is obviously a bit overkill for now, but I think it can
// be helpful as we add more notification types
const payloadSchema = z
    .object({
        payload: payload,
        topic: z.string().optional(),
        channelId: z.string().optional(),
    })
    .transform((data): AppNotification | undefined => {
        const eventBytes = data.payload.event ? bin_fromHexString(data.payload.event) : undefined
        const event = eventBytes ? fromBinary(StreamEventSchema, eventBytes) : undefined
        return {
            topic: data.topic,
            channelId: data.channelId, // aellis: not sure why we're doing double channelId at top level
            content: {
                kind: data.payload.kind,
                channelId: data.payload.channelId,
                spaceId: data.payload.spaceId,
                threadId: data.payload.threadId,
                senderId: data.payload.senderId,
                recipients: data.payload.recipients ?? [],
                event: event,
            },
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

const plaintextSchema = z.object({
    kind: z.nativeEnum(NotificationKind),
    spaceId: z.string().optional(),
    channelId: z.string(),
    threadId: z.string().optional(),
    refEventId: z.string().optional(),
    title: z.string(),
    body: z.string(),
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

export function pathFromAppNotification(notification: NotificationContent): NotificationClicked {
    if (
        isDMChannelStreamId(notification.channelId) ||
        isGDMChannelStreamId(notification.channelId)
    ) {
        return {
            notificationUrl:
                [PATHS.MESSAGES, encodeURIComponent(notification.channelId)].join('/') + '/',
            channelId: notification.channelId,
        }
    } else if (isChannelStreamId(notification.channelId)) {
        const spaceId = notification.spaceId ?? spaceIdFromChannelId(notification.channelId)
        if (notification.threadId) {
            return {
                notificationUrl: [
                    PATHS.SPACES,
                    encodeURIComponent(spaceId),
                    PATHS.CHANNELS,
                    encodeURIComponent(notification.channelId),
                    PATHS.REPLIES,
                    encodeURIComponent(notification.threadId),
                ].join('/'),
                spaceId: spaceId,
                channelId: notification.channelId,
                threadId: notification.threadId,
            }
        } else {
            return {
                notificationUrl: [
                    PATHS.SPACES,
                    encodeURIComponent(spaceId),
                    PATHS.CHANNELS,
                    encodeURIComponent(notification.channelId),
                ].join('/'),
                spaceId: notification.spaceId,
                channelId: notification.channelId,
            }
        }
    } else {
        return {
            notificationUrl: '/',
        }
    }
}
