export const AT_CHANNEL_MENTION = '@channel'
export const AT_CHANNEL_MENTION_DISPLAY = 'channel'

export enum NotificationAttachmentKind {
    Image = 'image',
    Gif = 'gif',
    File = 'file',
}

export enum NotificationKind {
    DirectMessage = 'direct_message',
    Mention = 'mention',
    NewMessage = 'new_message',
    ReplyTo = 'reply_to',
    AtChannel = '@channel',
    Reaction = 'reaction',
}

export interface MentionUsersRequestParams {
    spaceId: string
    channelId: string
    userIds: string[]
    threadId?: string
    tag: NotificationKind.Mention
}

export interface ReplyToUsersRequestParams {
    spaceId: string
    channelId: string
    userIds: string[]
    tag: NotificationKind.ReplyTo
}

export interface AtChannelRequestParams {
    spaceId: string
    channelId: string
    threadId?: string
    tag: NotificationKind.AtChannel
    userIds: string[]
}

export interface ReactionRequestParams {
    channelId: string
    userIds: string[]
    threadId?: string
    tag: NotificationKind.Reaction
}

export interface AttachmentTagRequestParams {
    spaceId?: string
    channelId: string
    tag: NotificationAttachmentKind
    userIds: string[]
    threadId?: string
}
