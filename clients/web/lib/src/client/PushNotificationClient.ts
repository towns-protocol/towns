import {
    Mention,
    MessageType,
    SendMessageOptions,
    isMentionedTextMessageOptions,
    isThreadIdOptions,
} from '../types/towns-types'

import {
    AttachmentTagRequestParams,
    MentionUsersRequestParams,
    NotificationAttachmentKind,
    ReplyToUsersRequestParams,
} from '../types/notification-types'
import { MediaInfo } from 'types/timeline-types'

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
        const spaceId = options.parentSpaceId

        // GiphyPickerCard sendMessage in this format and the GIF's title as message
        const messageIsImageGif =
            options?.messageType === MessageType.Image && options?.info?.mimetype === 'image/gif'

        // PlateEditor sendMessage in this format
        const messageIsAttachmentOnly =
            options?.messageType === MessageType.Text && 'attachments' in options && messageIsEmpty

        if (messageIsAttachmentOnly || messageIsImageGif) {
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

            return await this.sendAttachmentNotificationTag(
                attachmentKind,
                options.parentSpaceId,
                channelId,
            )
        }

        if (!spaceId) {
            return
        }

        if (
            isMentionedTextMessageOptions(options) &&
            options.mentions // don't do any extra work unless there are mentions
        ) {
            return this.sendMentionNotificationToWorker(spaceId, channelId, options.mentions)
        } else if (
            isThreadIdOptions(options) &&
            options.threadParticipants // don't do any extra work unless there are thread participants
        ) {
            return this.sendThreadNotificationToWorker(
                spaceId,
                channelId,
                options.threadParticipants,
            )
        }
    }

    public async sendAttachmentNotificationTag(
        tag: NotificationAttachmentKind,
        spaceId: string | undefined,
        channelId: string,
    ) {
        const headers = this.createHttpHeaders()
        const body = this.createAttachmentNotificationParams({
            spaceId,
            channelId,
            tag,
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

    private async sendMentionNotificationToWorker(
        spaceId: string,
        channelId: string,
        mentions: Mention[],
    ): Promise<void> {
        const headers = this.createHttpHeaders()
        const body = this.createMentionNotificationParams({
            spaceId,
            channelId,
            mentions,
        })
        const url = `${this.options.url}/api/tag/mention-users`
        console.log('PUSH: sending @mention tag to Push Notification Worker ...', url, body)
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            })
            console.log('PUSH: sent @mention tag to Push Notification Worker', response.status)
        } catch (error) {
            console.error('PUSH: error sending @mention tag to Push Notification Worker', error)
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

    private createMentionNotificationParams({
        spaceId,
        channelId,
        mentions,
    }: {
        spaceId: string
        channelId: string
        mentions: Mention[]
    }): MentionUsersRequestParams {
        // JSON schema:
        // https://www.notion.so/herenottherelabs/RFC-Notification-system-architecture-20aae4a6608640539838bafe24a0e48c?pvs=4#ab2259d34c5c4c649133a779b216b6b7
        const userIds = mentions.map((mention) => mention.userId)
        const params: MentionUsersRequestParams = {
            spaceId,
            channelId,
            userIds,
        }
        return params
    }

    private createAttachmentNotificationParams({
        spaceId,
        channelId,
        tag,
    }: {
        spaceId?: string
        channelId: string
        tag: NotificationAttachmentKind
    }): AttachmentTagRequestParams {
        const params: AttachmentTagRequestParams = {
            spaceId,
            channelId,
            tag,
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
