import { Mute, NotificationTag, Prisma, PushSubscription } from '@prisma/client'
import { database } from '../../infrastructure/database/prisma'
import {
    NotificationContentDmSchema,
    NotificationContentMessageSchema,
    NotificationPayload,
    NotifyUsersSchema,
    Urgency,
} from '../schema/notificationSchema'
import { NotificationKind } from '../schema/tagSchema'
import { sendNotificationViaWebPush } from './web-push/send-notification'
import { SendPushResponse, SendPushStatus } from './web-push/web-push-types'
import { PushType } from '../schema/subscriptionSchema'

export class NotificationService {
    constructor() {}

    public async getUsersToNotify(
        notificationData: NotifyUsersSchema,
        channelId: string,
        taggedUsers: NotificationTag[],
    ) {
        const notificationContent = notificationData.payload.content
        const notificationKind = notificationContent.kind as NotificationKind

        let mutedUsersInChannel: Set<string> = new Set()

        if (notificationKind === NotificationKind.NewMessage) {
            mutedUsersInChannel = new Set(
                (
                    await this.getMutedUsersInChannel(
                        notificationData.users,
                        (notificationContent as NotificationContentMessageSchema).spaceId,
                        channelId,
                    )
                ).map((user) => user.UserId),
            )
        }

        const metionUsersTagged = taggedUsers.filter(
            (taggedUser) => taggedUser.Tag === NotificationKind.Mention.toString(),
        )
        const replyToUsersTagged = taggedUsers.filter(
            (taggedUser) => taggedUser.Tag === NotificationKind.ReplyTo.toString(),
        )
        const dmUsers = taggedUsers.filter(
            (taggedUser) => taggedUser.Tag === NotificationKind.DirectMessage.toString(),
        )

        const mentionUsersToNotify = await this.identifyUsersToNotify(
            notificationData.users,
            metionUsersTagged,
            NotificationKind.Mention,
            mutedUsersInChannel,
        )

        const replyToUsersToNotify = await this.identifyUsersToNotify(
            notificationData.users,
            replyToUsersTagged,
            NotificationKind.ReplyTo,
            mutedUsersInChannel,
        )

        const dmUsersToNotify = await this.identifyUsersToNotify(
            notificationData.users,
            dmUsers,
            NotificationKind.DirectMessage,
            new Set(), // don't need to check if user is muted in channel for DMs and GDMs
        )

        return [...mentionUsersToNotify, ...replyToUsersToNotify, ...dmUsersToNotify]
    }

    private async identifyUsersToNotify(
        users: string[],
        taggedUsers: NotificationTag[],
        notificationKind: NotificationKind,
        mutedUsersInChannel: Set<string>,
    ) {
        const recipients: string[] = []
        const { usersMutedRule, usersTaggedGroup } = await this.getUsersMutedRuleAndTaggedGroup(
            users,
            taggedUsers,
            notificationKind,
        )

        for (const userId of users) {
            const isUserGloballyMuted = mutedUsersInChannel.has(userId)
            if (isUserGloballyMuted) {
                continue
            }

            const isUserMutedForNotificationKind = usersMutedRule.has(userId)
            if (isUserMutedForNotificationKind) {
                continue
            }

            const isTagged = usersTaggedGroup.has(userId)
            if (!isTagged) {
                continue
            }

            recipients.push(userId)
        }

        return recipients
    }

    private async getUsersMutedRuleAndTaggedGroup(
        users: string[],
        taggedUsers: NotificationTag[],
        notificationKind: NotificationKind,
    ) {
        let usersMutedRulePromise: Promise<{ UserId: string }[]>
        let usersTaggedGroup: Set<string>

        switch (notificationKind) {
            case NotificationKind.Mention:
                usersMutedRulePromise = this.getMutedMentionUsers(users)
                usersTaggedGroup = new Set(
                    taggedUsers
                        .filter((taggedUser) => taggedUser.Tag === NotificationKind.Mention)
                        .map((user) => user.UserId),
                )
                break
            case NotificationKind.ReplyTo:
                usersMutedRulePromise = this.getMutedReplyToUsers(users)
                usersTaggedGroup = new Set(
                    taggedUsers
                        .filter((taggedUser) => taggedUser.Tag === NotificationKind.ReplyTo)
                        .map((user) => user.UserId),
                )
                break
            case NotificationKind.DirectMessage:
                usersMutedRulePromise = this.getMutedDirectMessageUsers(users)
                // no need to tag users for direct messages
                usersTaggedGroup = new Set(users)
                break
            default:
                throw new Error(`Unsupported notification kind: ${notificationKind}`)
        }

        const usersMutedRule = new Set((await usersMutedRulePromise).map((user) => user.UserId))

        return { usersMutedRule, usersTaggedGroup }
    }

    public async createNotificationAsyncRequests(
        notificationData: NotifyUsersSchema,
        usersToNotify: string[],
        tx: Prisma.TransactionClient,
    ) {
        const pushNotificationPromises: Promise<SendPushResponse>[] = []
        const isDMorGDM = notificationData.payload.content.kind === NotificationKind.DirectMessage

        for (const userId of usersToNotify) {
            const option: NotificationOptions = {
                userId,
                payload: notificationData.payload,
                channelId: notificationData.payload.content.channelId,
                urgency: notificationData.urgency,
            }
            if (isDMorGDM) {
                ;(option.payload.content as NotificationContentDmSchema).recipients =
                    notificationData.users.filter((user) => user !== notificationData.sender)
            }

            const pushSubscriptions = await tx.pushSubscription.findMany({
                where: {
                    UserId: userId,
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

    private async sendNotificationViaWebPush(
        options: NotificationOptions,
        subscription: PushSubscription,
    ) {
        return sendNotificationViaWebPush(options, subscription)
    }

    public async dispatchAllPushNotification(
        pushNotificationRequests: Promise<SendPushResponse>[],
        tx: Prisma.TransactionClient,
    ) {
        let sendResults: PromiseSettledResult<SendPushResponse>[] = []
        sendResults = await Promise.allSettled(pushNotificationRequests)

        // handle the results
        // count the number of successful notifications sent
        let notificationsSentCount = 0
        for (const result of sendResults) {
            if (result.status === 'rejected') {
                console.log('failed to send notification', result.reason)
                continue
            }

            if (result.value.status === SendPushStatus.Success) {
                notificationsSentCount++
                continue
            }

            console.log('failed to send notification', result.value.status, result.value.userId)
            await this.deleteFailedSubscription(result, tx)
        }
        return notificationsSentCount
    }

    public async deleteFailedSubscription(
        result: PromiseFulfilledResult<SendPushResponse>,
        tx: Prisma.TransactionClient,
    ) {
        console.log(
            'deleting subscription from the db',
            'userId',
            result.value.userId,
            'pushSubscription',
            result.value.pushSubscription,
        )
        try {
            await tx.pushSubscription.delete({
                where: {
                    UserId: result.value.userId,
                    PushSubscription: result.value.pushSubscription,
                },
            })
            console.log(
                'deleted subscription from the db',
                'userId',
                result.value.userId,
                'subscription',
                result.value.pushSubscription,
            )
        } catch (err) {
            console.error('failed to delete subscription from the db', err)
        }
    }

    private async getMutedDirectMessageUsers(users: string[]) {
        return await database.userSettings.findMany({
            where: {
                DirectMessage: false,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    private async getMutedUsersInChannel(users: string[], spaceId: string, channelId: string) {
        return await database.userSettingsChannel.findMany({
            where: {
                SpaceId: spaceId,
                ChannelId: channelId,
                ChannelMute: Mute.muted,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    private async getMutedMentionUsers(users: string[]) {
        return await database.userSettings.findMany({
            where: {
                Mention: false,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }

    private async getMutedReplyToUsers(users: string[]) {
        return await database.userSettings.findMany({
            where: {
                ReplyTo: false,
                UserId: { in: users },
            },
            select: {
                UserId: true,
            },
        })
    }
}

export interface NotificationOptions {
    userId: string // recipient
    channelId: string
    payload: NotificationPayload
    urgency?: Urgency
}

export const notificationService = new NotificationService()
