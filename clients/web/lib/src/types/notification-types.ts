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

export interface AttachmentTagRequestParams {
    spaceId?: string
    channelId: string
    tag: NotificationAttachmentKind
}
