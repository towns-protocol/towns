export const AT_CHANNEL_MENTION = '@channel'
export const AT_CHANNEL_MENTION_DISPLAY = 'channel'

export enum NotificationAttachmentKind {
    Image = 'image',
    Gif = 'gif',
    File = 'file',
}

export interface MentionUsersRequestParams {
    spaceId: string
    channelId: string
    userIds: string[]
}

export interface ReplyToUsersRequestParams {
    spaceId: string
    channelId: string
    userIds: string[]
}

export interface AtChannelRequestParams {
    spaceId: string
    channelId: string
}

export interface AttachmentTagRequestParams {
    spaceId?: string
    channelId: string
    tag: NotificationAttachmentKind
}
