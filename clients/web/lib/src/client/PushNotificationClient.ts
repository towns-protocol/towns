import {
    Mention,
    MessageType,
    SendMessageOptions,
    isMentionedTextMessageOptions,
    isThreadIdOptions,
} from '../types/towns-types'

import {
    AT_CHANNEL_MENTION,
    AtChannelRequestParams,
    AttachmentTagRequestParams,
    MentionUsersRequestParams,
    NotificationAttachmentKind,
    NotificationKind,
    ReactionRequestParams,
    ReplyToUsersRequestParams,
} from '../types/notification-types'
import { MediaInfo } from 'types/timeline-types'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'

interface PushNotificationClientOptions {
    url: string // push notification worker's url
    authToken: string // bearer token for push notification worker
}

export class PushNotificationClient {
    private options: PushNotificationClientOptions

    constructor(options: PushNotificationClientOptions) {
        this.options = options
    }

    public async sendNotificationTagIfAny(
        channelId: string,
        messageIsEmpty: boolean,
        options: SendMessageOptions,
    ): Promise<void> {
        console.log('PUSH: sendNotificationTagIfAny', options)
        const tags: TagParams[] = []

        // GiphyPickerCard sendMessage in this format and the GIF's title as message
        const messageIsImageGif =
            options?.messageType === MessageType.Image && options?.info?.mimetype === 'image/gif'
        // PlateEditor sendMessage in this format
        const messageIsAttachmentOnly =
            options?.messageType === MessageType.Text && 'attachments' in options && messageIsEmpty

        const isThreadWithParticipants = isThreadIdOptions(options) && options.threadParticipants
        const threadId = isThreadWithParticipants ? options.threadId : undefined
        const isDMorGDMorChannelWithThread =
            isDMChannelStreamId(channelId) ||
            isGDMChannelStreamId(channelId) ||
            (isChannelStreamId(channelId) && isThreadWithParticipants)
        const isNotifyAttachment =
            (messageIsAttachmentOnly || messageIsImageGif) && isDMorGDMorChannelWithThread

        if (isNotifyAttachment) {
            let attachmentKind = NotificationAttachmentKind.File
            if (messageIsAttachmentOnly) {
                const attachment = options.attachments![0]
                // Gifs can also be sent as attachments
                if ((attachment.info as MediaInfo).mimetype === 'image/gif') {
                    attachmentKind = NotificationAttachmentKind.Gif
                } else if ((attachment.info as MediaInfo).mimetype.includes('image/')) {
                    attachmentKind = NotificationAttachmentKind.Image
                }
            } else if (messageIsImageGif) {
                attachmentKind = NotificationAttachmentKind.Gif
            }

            // Set userIds with @channel to avoid discovering all user ids in the channel if the message is not in a thread
            let userIds = new Set<string>([AT_CHANNEL_MENTION])
            if (isThreadWithParticipants) {
                userIds = options.threadParticipants!
            }
            console.log('PUSH: sendNotificationTagIfAny', { attachmentKind, userIds })

            tags.push({
                spaceId: options.parentSpaceId,
                channelId,
                tag: attachmentKind,
                userIds: Array.from(userIds),
                threadId,
            } satisfies AttachmentTagRequestParams)
        }

        const spaceId = options.parentSpaceId ?? ''
        if (!spaceId) {
            if (tags.length > 0) {
                return this.sendNotificationTag(tags)
            }

            // mention, @channel and replyTo require the spaceId
            return
        }
        let userMentions: Mention[] = []
        if (
            isMentionedTextMessageOptions(options) &&
            options.mentions // don't do any extra work unless there are mentions
        ) {
            const channelMentions = options.mentions.filter((mention) => mention.atChannel)
            userMentions = options.mentions.filter((mention) => !mention.atChannel)
            console.log('PUSH: sendNotificationTagIfAny', { channelMentions, userMentions })
            if (channelMentions.length > 0) {
                tags.push({
                    spaceId,
                    channelId,
                    threadId,
                    tag: NotificationKind.AtChannel,
                    userIds: [NotificationKind.AtChannel],
                } satisfies AtChannelRequestParams)
            }
            if (userMentions.length > 0) {
                tags.push({
                    spaceId,
                    channelId,
                    userIds: userMentions.map((mention) => mention.userId),
                    threadId,
                    tag: NotificationKind.Mention,
                } satisfies MentionUsersRequestParams)
            }
        }

        if (isThreadWithParticipants) {
            const threadParticipants: Set<string> = new Set<string>()
            // skip any users who were mentioned in the message
            // because they are already being tagged in above logic.
            options.threadParticipants!.forEach((u) => {
                if (u !== AT_CHANNEL_MENTION && !userMentions.find((m) => m.userId === u)) {
                    threadParticipants.add(u)
                }
            })
            //console.log('sendNotificationTagIfAny', { threadParticipants })
            if (threadParticipants.size > 0) {
                tags.push({
                    spaceId,
                    channelId,
                    userIds: Array.from(threadParticipants),
                    tag: NotificationKind.ReplyTo,
                } satisfies ReplyToUsersRequestParams)
            }
        }

        if (tags.length > 0) {
            return this.sendNotificationTag(tags)
        }
    }

    private async sendNotificationTag(tags: TagParams[]): Promise<void> {
        const headers = this.createHttpHeaders()
        const url = `${this.options.url}/api/tag`
        console.log('PUSH: sending tags to Push Notification Worker ...', url, tags)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(tags),
            })
            console.log('PUSH: sent tags to Push Notification Worker', response.status)
        } catch (error) {
            console.error('PUSH: error sending tags to Push Notification Worker', error)
        }
    }

    public async sendUserReactionToNotificationService(
        channelId: string,
        creatorUserId: string,
        threadId?: string,
    ): Promise<void> {
        const headers = this.createHttpHeaders()
        const body = [
            {
                channelId,
                userIds: [creatorUserId],
                threadId,
                tag: NotificationKind.Reaction,
            } satisfies ReactionRequestParams,
        ]
        const url = `${this.options.url}/api/tag`
        console.log('PUSH: sending reaction tag to Notification Service ...', url, body)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            console.log('PUSH: sent reaction tag to Notification Service', response.status)
        } catch (error) {
            console.error('PUSH: error sending reaction tag to Notification Service', error)
        }
    }

    private createHttpHeaders(): HeadersInit {
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.options.authToken}`,
        }
        return headers
    }
}

type TagParams =
    | AtChannelRequestParams
    | AttachmentTagRequestParams
    | MentionUsersRequestParams
    | ReplyToUsersRequestParams
    | ReactionRequestParams
