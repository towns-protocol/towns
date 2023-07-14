import {
    Mention,
    SendMessageOptions,
    isMentionedTextMessageOption,
    isSpaceIdOptions,
} from '../types/zion-types'

/*
  Functions for sending or showing push notifications.
*/
import {
    MentionNotificationContent,
    NotificationPayload,
    NotificationRequestParams,
    NotificationType,
} from '../types/notification-types'

interface PushNotificationClientOptions {
    url: string // push notification worker's url
    authToken: string // bearer token for push notification worker
}

export class PushNotificationClient {
    private options: PushNotificationClientOptions

    constructor(options: PushNotificationClientOptions) {
        this.options = options
    }

    public async sendMentionedNotifications(
        channelId: string,
        options?: SendMessageOptions,
    ): Promise<Response | undefined> {
        if (!options) {
            return
        }
        if (
            isMentionedTextMessageOption(options) &&
            isSpaceIdOptions(options) &&
            options.parentSpaceId &&
            options.mentions // don't do any extra work unless there are mentions
        ) {
            const headers = this.createHttpHeaders()
            const body = this.createMentionNotificationParams({
                spaceId: options.parentSpaceId.networkId,
                channelId,
                mentions: options.mentions,
            })
            const url = `${this.options.url}/api/notify-users`
            console.log('PUSH: sending @mention to Push Notification Worker ...', url, body)
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                })
                console.log('PUSH: sent @mention to Push Notification Worker', response.status)
            } catch (error) {
                console.error('PUSH: error sending @mention to Push Notification Worker', error)
            }
        } else {
            // no mention-specific notification
            //console.log('PUSH: no @mention to send')
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
    }): NotificationRequestParams {
        // JSON schema:
        // https://www.notion.so/herenottherelabs/RFC-Notification-system-architecture-20aae4a6608640539838bafe24a0e48c?pvs=4#ab2259d34c5c4c649133a779b216b6b7
        const content: MentionNotificationContent = {
            spaceId,
            channelId,
        }
        const payload: NotificationPayload = {
            notificationType: NotificationType.Mention,
            content,
        }
        const users = mentions.map((mention) => mention.userId)
        return {
            topic: channelId,
            payload,
            users,
            sender: '', // tbd if this field should be removed
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
