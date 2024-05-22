import { z } from 'zod'
import { NotificationAttachmentKind, NotificationKind } from './tagSchema'

export enum Urgency {
    VERY_LOW = 'very-low',
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
}

export const notificationContentMessageSchema = z.object({
    kind: z.enum([
        NotificationKind.NewMessage,
        NotificationKind.ReplyTo,
        NotificationKind.Mention,
        NotificationKind.AtChannel,
        NotificationKind.Reaction,
    ]),
    spaceId: z.string(),
    channelId: z.string(),
    senderId: z.string(),
    threadId: z.string().optional(),
    attachmentOnly: z.nativeEnum(NotificationAttachmentKind).optional(),
    reaction: z.boolean().optional(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: z.object({}) as any,
})

export const notificationContentDmSchema = z.object({
    kind: z.enum([NotificationKind.DirectMessage]),
    channelId: z.string(),
    senderId: z.string(),
    recipients: z.array(z.string()),
    attachmentOnly: z.nativeEnum(NotificationAttachmentKind).optional(),
    reaction: z.boolean().optional(),
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
    urgency: z.nativeEnum(Urgency).optional(),
    forceNotify: z.boolean().optional(),
})
