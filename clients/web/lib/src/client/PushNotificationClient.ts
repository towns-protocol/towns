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
    ReplyToUsersRequestParams,
} from '../types/notification-types'
import { MediaInfo } from 'types/timeline-types'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'

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

        // GiphyPickerCard sendMessage in this format and the GIF's title as message
        const messageIsImageGif =
            options?.messageType === MessageType.Image && options?.info?.mimetype === 'image/gif'
        // PlateEditor sendMessage in this format
        const messageIsAttachmentOnly =
            options?.messageType === MessageType.Text && 'attachments' in options && messageIsEmpty

        const isThreadWithParticipants = isThreadIdOptions(options) && options.threadParticipants
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

            return await this.sendAttachmentNotificationTag(
                attachmentKind,
                options.parentSpaceId,
                channelId,
                userIds,
            )
        }

        const spaceId = options.parentSpaceId ?? ''
        const postRequests: Promise<void>[] = []
        let userMentions: Mention[] = []
        if (
            isMentionedTextMessageOptions(options) &&
            options.mentions // don't do any extra work unless there are mentions
        ) {
            const channelMentions = options.mentions.filter((mention) => mention.atChannel)
            userMentions = options.mentions.filter((mention) => !mention.atChannel)
            console.log('PUSH: sendNotificationTagIfAny', { channelMentions, userMentions })
            if (channelMentions.length > 0) {
                postRequests.push(this.sendAtChannelToNotificationService(spaceId, channelId))
            }
            if (userMentions.length > 0) {
                postRequests.push(
                    this.sendUserMentionToNotificationService(spaceId, channelId, userMentions),
                )
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
                postRequests.push(
                    this.sendThreadNotificationToWorker(spaceId, channelId, threadParticipants),
                )
            }
        }

        await Promise.all(postRequests)
    }

    private async sendAttachmentNotificationTag(
        tag: NotificationAttachmentKind,
        spaceId: string | undefined,
        channelId: string,
        userIds: Set<string>,
    ) {
        const headers = this.createHttpHeaders()
        const body = this.createAttachmentNotificationParams({
            spaceId,
            channelId,
            tag,
            userIds,
        })
        const url = `${this.options.url}/api/tag/attachment`
        console.log('PUSH: sending attachment tag to Push Notification Worker ...', url, body)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            console.log('PUSH: sent attachment tag to Push Notification Worker', response.status)
        } catch (error) {
            console.error('PUSH: error sending attachment tag to Push Notification Worker', error)
        }
    }

    private async sendThreadNotificationToWorker(
        spaceId: string,
        channelId: string,
        participants: Set<string>,
    ): Promise<void> {
        const headers = this.createHttpHeaders()
        const body = this.createReplyToNotificationParams({
            spaceId,
            channelId,
            participants,
        })
        const url = `${this.options.url}/api/tag/reply-to-users`
        console.log('PUSH: sending reply_to tags to Push Notification Worker ...', url, body)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            console.log('PUSH: sent reply_to tags to Push Notification Worker', response.status)
        } catch (error) {
            console.error('PUSH: error sending reply_to tags to Push Notification Worker', error)
        }
    }

    private async sendUserMentionToNotificationService(
        spaceId: string,
        channelId: string,
        mentions: Mention[],
    ): Promise<void> {
        const headers = this.createHttpHeaders()
        const body = this.createUserMentionNotificationParams({
            spaceId,
            channelId,
            mentions,
        })
        const url = `${this.options.url}/api/tag/mention-users`
        console.log('PUSH: sending @userMention tag to Notification Service ...', url, body)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            console.log('PUSH: sent @userMention tag to Notification Service', response.status)
        } catch (error) {
            console.error('PUSH: error sending @userMention tag to Notification Service', error)
        }
    }

    private async sendAtChannelToNotificationService(
        spaceId: string,
        channelId: string,
    ): Promise<void> {
        const headers = this.createHttpHeaders()
        const body = this.createAtChannelNotificationParams({
            spaceId,
            channelId,
        })
        const url = `${this.options.url}/api/tag/at-channel`
        console.log('PUSH: sending @channel tag to Notification Service ...', url, body)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            console.log('PUSH: sent @channel tag to Notification Service', response.status)
        } catch (error) {
            console.error('PUSH: error sending @channel tag to Notification Service', error)
        }
    }

    private createUserMentionNotificationParams({
        spaceId,
        channelId,
        mentions,
    }: {
        spaceId: string
        channelId: string
        mentions: Mention[]
    }): MentionUsersRequestParams {
        const userIds = mentions.map((mention) => mention.userId)
        const params: MentionUsersRequestParams = {
            spaceId,
            channelId,
            userIds,
        }
        return params
    }

    private createAtChannelNotificationParams({
        spaceId,
        channelId,
    }: {
        spaceId: string
        channelId: string
    }): AtChannelRequestParams {
        const params: AtChannelRequestParams = {
            spaceId,
            channelId,
        }
        return params
    }

    private createAttachmentNotificationParams({
        spaceId,
        channelId,
        tag,
        userIds,
    }: {
        spaceId?: string
        channelId: string
        tag: NotificationAttachmentKind
        userIds: Set<string>
    }): AttachmentTagRequestParams {
        const params: AttachmentTagRequestParams = {
            spaceId,
            channelId,
            tag,
            userIds: Array.from(userIds),
        }
        return params
    }

    private createReplyToNotificationParams({
        spaceId,
        channelId,
        participants,
    }: {
        spaceId: string
        channelId: string
        participants: Set<string>
    }): ReplyToUsersRequestParams {
        const userIds: string[] = []
        for (const u of participants) {
            userIds.push(u)
        }
        const params: ReplyToUsersRequestParams = {
            spaceId,
            channelId,
            userIds,
        }
        return params
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
