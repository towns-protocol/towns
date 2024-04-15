import { z } from 'zod'

export enum NotificationKind {
    DirectMessage = 'direct_message',
    Mention = 'mention',
    NewMessage = 'new_message',
    ReplyTo = 'reply_to',
    AtChannel = '@channel',
}

export enum NotificationAttachmentKind {
    Image = 'image',
    Gif = 'gif',
    File = 'file',
}

export const tagMentionUsersSchema = z.object({
    spaceId: z.string(),
    channelId: z.string().min(1),
    userIds: z.array(z.string()),
})

export const tagReplyUserSchema = z.object({
    spaceId: z.string(),
    channelId: z.string().min(1),
    userIds: z.array(z.string()),
})

export const tagAtChannelSchema = z.object({
    spaceId: z.string(),
    channelId: z.string().min(1),
})

export const tagAttachmentSchema = z.object({
    spaceId: z.string().optional(),
    channelId: z.string(),
    tag: z.nativeEnum(NotificationAttachmentKind),
})
