import { z } from 'zod'

export enum urgency {
    VERY_LOW = 'very-low',
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
}

export const notificationContentMessageSchema = z.object({
    kind: z.enum(['new_message', 'reply_to', 'mention']),
    spaceId: z.string(),
    channelId: z.string(),
    senderId: z.string(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: z.object({}) as any,
})

export const notificationContentDmSchema = z.object({
    kind: z.enum(['direct_message']),
    channelId: z.string(),
    senderId: z.string(),
    recipients: z.array(z.string()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: z.object({}) as any,
})

export const notificationContentSchema = z.union([
    notificationContentMessageSchema,
    notificationContentDmSchema,
])

export const notificationPayloadSchema = z.object({
    content: notificationContentSchema,
})

export const notifyUsersSchema = z.object({
    sender: z.string(),
    users: z.array(z.string()).min(1),
    payload: notificationPayloadSchema,
    urgency: z.nativeEnum(urgency).optional(),
    forceNotify: z.boolean().optional(),
})
