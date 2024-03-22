import {
    NotificationContentDmSchema,
    NotificationContentMessageSchema,
    NotificationPayloadSchema,
    NotifyUsersSchema,
} from '../../types'
import { SendPushResponse, SendPushStatus } from './web-push/web-push-types'

import { NotificationTag } from '@prisma/client'
import { UserSettingsTables } from '../database/userSettingsTables'
import { database } from '../../infrastructure/database/prisma'
import { env } from '../utils/environment'
import { logger } from '../logger'
import { NotificationKind } from '../schema/tagSchema'
import { PushType } from '../schema/subscriptionSchema'
import { sendNotificationViaWebPush } from './web-push/send-notification'
import { Urgency } from '../schema/notificationSchema'

export interface NotifyUser {
    userId: string
    kind: NotificationKind
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

        let mutedMentionUsers = new Set()
        if (metionUsersTagged.size > 0) {
            mutedMentionUsers = new Set(
                (await UserSettingsTables.getUserMutedInMention(notificationData.users)).map(
                    (user) => user.UserId,
                ),
            )
        }

        let mutedReplyToUsers = new Set()
        if (replyToUsersTagged.size > 0) {
            mutedReplyToUsers = new Set(
                (await UserSettingsTables.getUserMutedInReplyTo(notificationData.users)).map(
                    (user) => user.UserId,
                ),
            )
        }

        let mutedDMUsers = new Set()
        if (isDMorGDM) {
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

            const isUserNotTagged =
                !isDMorGDM && !metionUsersTagged.has(userId) && !replyToUsersTagged.has(userId)
            const isUserMutedForMention =
                metionUsersTagged.has(userId) && mutedMentionUsers.has(userId)
            const isUserMutedForReplyTo =
                replyToUsersTagged.has(userId) && mutedReplyToUsers.has(userId)
            const isUserMutedForDM = isDMorGDM && mutedDMUsers.has(userId)

            if (
                isUserNotTagged ||
                isUserMutedForMention ||
                isUserMutedForReplyTo ||
                isUserMutedForDM
            ) {
                continue
            }

            // if user is tagged, use the specific kind of notification
            if (metionUsersTagged.has(userId)) {
                recipients[userId] = {
                    userId,
                    kind: NotificationKind.Mention,
                }
            } else if (replyToUsersTagged.has(userId)) {
                recipients[userId] = {
                    userId,
                    kind: NotificationKind.ReplyTo,
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
            payload.content.kind = n.kind
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
                logger.info('failed to send notification', result.reason)
                continue
            }

            if (result.value.status === SendPushStatus.Success) {
                notificationsSentCount++
                continue
            }

            logger.info('failed to send notification', JSON.stringify(result))
            await this.deleteFailedSubscription(result)
        }
        return notificationsSentCount
    }

    public async deleteFailedSubscription(
        result: PromiseFulfilledResult<SendPushResponse>,
    ): Promise<void> {
        logger.info(
            'deleting subscription from the db',
            'userId',
            result.value.userId,
            'pushSubscription',
            result.value.pushSubscription,
        )
        try {
            await database.pushSubscription.delete({
                where: {
                    UserId: result.value.userId,
                    PushSubscription: result.value.pushSubscription,
                },
            })
            logger.info(
                'deleted subscription from the db',
                'userId',
                result.value.userId,
                'subscription',
                result.value.pushSubscription,
            )
        } catch (err) {
            logger.error('failed to delete subscription from the db', err)
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
