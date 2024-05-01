import {
    NotificationContentDmSchema,
    NotificationContentMessageSchema,
    NotificationPayloadSchema,
    NotifyUsersSchema,
} from '../types'
import { SendPushResponse, SendPushStatus } from './services/web-push/web-push-types'

import { NotificationTag } from '@prisma/client'
import { UserSettingsTables } from './userSettingsTables'
import { database } from './prisma'
import { env } from './utils/environment'
import { NotificationAttachmentKind, NotificationKind } from './tagSchema'
import { PushType } from './subscriptionSchema'
import { sendNotificationViaWebPush } from './services/web-push/send-notification'
import { Urgency } from './notificationSchema'
import { createLogger } from './services/logger'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './services/stream/id'
import { isPayloadLengthValid } from './services/web-push/crypto-utils'

const logger = createLogger('notificationService')

export interface NotifyUser {
    userId: string
    kind: NotificationKind | NotificationAttachmentKind
}

export interface NotifyUsers {
    [userId: string]: NotifyUser
}

export class NotificationService {
    constructor() {}

    public async getUsersToNotify(
        notificationData: NotifyUsersSchema,
        channelId: string,
        taggedUsers: NotificationTag[],
    ): Promise<NotifyUser[]> {
        const recipients: NotifyUsers = {}
        const notificationContent = notificationData.payload.content
        const isDMorGDM = notificationContent.kind === NotificationKind.DirectMessage
        const isAtChannel = taggedUsers.some(
            (taggedUser) => taggedUser.Tag === NotificationKind.AtChannel,
        )

        let mutedUsersInChannel: Set<string> = new Set()
        // if notification kind is DM or GDM, we don't need to check if user is muted in channel
        if (!isDMorGDM) {
            mutedUsersInChannel = new Set(
                (
                    await UserSettingsTables.getUserMutedInChannel(
                        notificationData.users,
                        (notificationContent as NotificationContentMessageSchema).spaceId,
                        channelId,
                    )
                ).map((user) => user.UserId),
            )
        }

        const metionUsersTagged = new Set(
            taggedUsers
                .filter((taggedUser) => taggedUser.Tag === NotificationKind.Mention.toString())
                .map((user) => user.UserId),
        )
        const replyToUsersTagged = new Set(
            taggedUsers
                .filter((taggedUser) => taggedUser.Tag === NotificationKind.ReplyTo.toString())
                .map((user) => user.UserId),
        )
        const reactionUsersTagged = new Set(
            taggedUsers
                .filter((taggedUser) => taggedUser.Tag === NotificationKind.Reaction.toString())
                .map((user) => user.UserId),
        )
        const attachmentUsersTagged = taggedUsers.filter((taggedUser) =>
            Object.values(NotificationAttachmentKind).includes(
                taggedUser.Tag as NotificationAttachmentKind,
            ),
        )

        let attachmentReplyToUsers = new Set()
        let attachmentDMorGDMUsers = new Set()
        if (attachmentUsersTagged.length > 0) {
            const usersTagget = new Set(attachmentUsersTagged.map((user) => user.UserId))
            if (isChannelStreamId(channelId)) {
                attachmentReplyToUsers = usersTagget
            } else if (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)) {
                attachmentDMorGDMUsers = usersTagget
            }
        }

        const isAttachmentNotifyChannel = attachmentUsersTagged.some(
            (user) => user.UserId === NotificationKind.AtChannel,
        )

        let mutedMentionUsers = new Set()
        if (metionUsersTagged.size > 0) {
            mutedMentionUsers = new Set(
                (await UserSettingsTables.getUserMutedInMention(notificationData.users)).map(
                    (user) => user.UserId,
                ),
            )
        }

        let mutedReplyToUsers = new Set()
        if (replyToUsersTagged.size > 0 || attachmentReplyToUsers.size > 0) {
            mutedReplyToUsers = new Set(
                (await UserSettingsTables.getUserMutedInReplyTo(notificationData.users)).map(
                    (user) => user.UserId,
                ),
            )
        }

        let mutedDMUsers = new Set()
        if (isDMorGDM || attachmentDMorGDMUsers.size > 0) {
            mutedDMUsers = new Set(
                (await UserSettingsTables.getUserMutedInDirectMessage(notificationData.users)).map(
                    (user) => user.UserId,
                ),
            )
        }

        for (const userId of notificationData.users) {
            const isUserGloballyMuted = mutedUsersInChannel.has(userId)
            if (userId === notificationData.sender || (!isDMorGDM && isUserGloballyMuted)) {
                continue
            }

            const isUserTagged =
                isDMorGDM ||
                isAtChannel ||
                isAttachmentNotifyChannel ||
                metionUsersTagged.has(userId) ||
                replyToUsersTagged.has(userId) ||
                reactionUsersTagged.has(userId) ||
                attachmentUsersTagged.some((user) => user.UserId === userId)

            const isUserMutedForMention =
                metionUsersTagged.has(userId) && mutedMentionUsers.has(userId)
            const isUserMutedForReplyTo =
                (attachmentReplyToUsers.size > 0 || replyToUsersTagged.has(userId)) &&
                mutedReplyToUsers.has(userId)
            const isUserMutedForDM =
                (attachmentDMorGDMUsers.size > 0 || isDMorGDM) && mutedDMUsers.has(userId)

            if (
                !isUserTagged ||
                isUserMutedForMention ||
                isUserMutedForReplyTo ||
                isUserMutedForDM
            ) {
                continue
            }

            if (reactionUsersTagged.size > 0) {
                if (reactionUsersTagged.has(userId)) {
                    recipients[userId] = {
                        userId,
                        kind: NotificationKind.Reaction,
                    }
                }
            } else if (metionUsersTagged.has(userId)) {
                recipients[userId] = {
                    userId,
                    kind: NotificationKind.Mention,
                }
            } else if (replyToUsersTagged.has(userId)) {
                recipients[userId] = {
                    userId,
                    kind: NotificationKind.ReplyTo,
                }
            } else if (
                isAttachmentNotifyChannel ||
                attachmentReplyToUsers.has(userId) ||
                attachmentDMorGDMUsers.has(userId)
            ) {
                recipients[userId] = {
                    userId,
                    kind: attachmentUsersTagged[0].Tag as NotificationAttachmentKind,
                }
            } else {
                recipients[userId] = {
                    userId,
                    kind: notificationData.payload.content.kind,
                }
            }
        }

        return Object.values(recipients)
    }

    public async createNotificationAsyncRequests(
        notificationData: NotifyUsersSchema,
        usersToNotify: NotifyUser[],
    ): Promise<Promise<SendPushResponse>[]> {
        const pushNotificationPromises: Promise<SendPushResponse>[] = []
        const isDMorGDM = notificationData.payload.content.kind === NotificationKind.DirectMessage

        for (const n of usersToNotify) {
            const payload = { ...notificationData.payload }

            let kind = n.kind

            const isAttachmentOnly = Object.values(NotificationAttachmentKind).includes(
                kind as unknown as NotificationAttachmentKind,
            )
            if (isAttachmentOnly) {
                logger.info(`Attachment notification ${kind}`)
                payload.content.attachmentOnly = kind as NotificationAttachmentKind
                if (
                    isDMChannelStreamId(payload.content.channelId) ||
                    isGDMChannelStreamId(payload.content.channelId)
                ) {
                    kind = NotificationKind.DirectMessage
                } else if (isChannelStreamId(payload.content.channelId)) {
                    kind = NotificationKind.ReplyTo
                }
                payload.content.event = {}
            }

            if (kind === NotificationKind.Reaction) {
                if (
                    isDMChannelStreamId(payload.content.channelId) ||
                    isGDMChannelStreamId(payload.content.channelId)
                ) {
                    kind = NotificationKind.DirectMessage
                } else if (isChannelStreamId(payload.content.channelId)) {
                    kind = NotificationKind.ReplyTo
                }
                payload.content.reaction = true
            }

            payload.content.kind = kind as NotificationKind

            if (!isPayloadLengthValid(JSON.stringify(payload))) {
                payload.content.event = {}
                logger.info('Payload size exceeds the limit, trimming down the payload')
            }

            const option: NotificationOptions = {
                userId: n.userId,
                payload: payload,
                channelId: notificationData.payload.content.channelId,
                urgency: notificationData.urgency,
            }
            if (isDMorGDM) {
                ;(option.payload.content as NotificationContentDmSchema).recipients =
                    notificationData.users.filter((user) => user !== notificationData.sender)
            }

            const pushSubscriptions = await database.pushSubscription.findMany({
                where: {
                    UserId: n.userId,
                },
            })

            for (const subscription of pushSubscriptions) {
                if (subscription.PushType === PushType.WebPush) {
                    const sendNotificationPromise = sendNotificationViaWebPush(option, subscription)
                    pushNotificationPromises.push(sendNotificationPromise)
                }
            }
        }
        return pushNotificationPromises
    }

    public async dispatchAllPushNotification(
        pushNotificationRequests: Promise<SendPushResponse>[],
    ): Promise<number> {
        if (env.NOTIFICATION_SYNC_ENABLED === 'false') {
            // notification dispatch is disabled
            return 0
        }

        let sendResults: PromiseSettledResult<SendPushResponse>[] = []
        sendResults = await Promise.allSettled(pushNotificationRequests)

        // handle the results
        // count the number of successful notifications sent
        let notificationsSentCount = 0
        for (const result of sendResults) {
            if (result.status === 'rejected') {
                logger.info('failed to send notification', { result })
                continue
            }

            if (result.value.status === SendPushStatus.Success) {
                notificationsSentCount++
                continue
            }

            logger.info('failed to send notification', { result })
            await this.deleteFailedSubscription(result)
        }
        return notificationsSentCount
    }

    public async deleteFailedSubscription(
        result: PromiseFulfilledResult<SendPushResponse>,
    ): Promise<void> {
        logger.info(`deleting subscription from the db - userId: ${result.value.userId}`, {
            pushSubscription: result.value.pushSubscription,
        })
        try {
            await database.pushSubscription.delete({
                where: {
                    UserId: result.value.userId,
                    PushSubscription: result.value.pushSubscription,
                },
            })
        } catch (err) {
            logger.error('failed to delete subscription from the db', { err })
        }
    }
}

export interface NotificationOptions {
    userId: string // recipient
    channelId: string
    payload: NotificationPayloadSchema
    urgency?: Urgency
}

export const notificationService = new NotificationService()
