import {
    NotificationContentDmSchema,
    NotificationContentMessageSchema,
    NotificationPayloadSchema,
    NotifyUsersSchema,
} from '../types'
import { SendPushResponse } from './services/web-push/web-push-types'

import { NotificationTag } from '@prisma/client'
import { UserSettingsTables } from './userSettingsTables'
import { database } from './prisma'
import { NotificationAttachmentKind, NotificationKind } from './tagSchema'
import { PushType } from './subscriptionSchema'
import {
    sendNotificationViaAPNS,
    sendNotificationViaWebPush,
} from './services/web-push/send-notification'
import { Urgency } from './notificationSchema'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './services/stream/id'
import { isPayloadLengthValid } from './services/web-push/crypto-utils'
import { notificationServiceLogger } from './logger'

export interface NotifyUser {
    userId: string
    kind: NotificationKind | NotificationAttachmentKind
    threadId?: string
}

export interface NotifyUsers {
    [userId: string]: NotifyUser
}

interface TaggedUserWithThreadId {
    userId: string
    threadId?: string
}

export class NotificationService {
    constructor() {}

    public async getUsersToNotify(
        notificationData: NotifyUsersSchema,
        channelId: string,
        taggedUsers: NotificationTag[],
    ): Promise<NotifyUser[]> {
        const startTime = Date.now()
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
                        notificationContent.spaceId,
                        channelId,
                    )
                ).map((user) => user.UserId),
            )
        }

        const metionUsersTagged: TaggedUserWithThreadId[] = taggedUsers
            .filter((taggedUser) => taggedUser.Tag === NotificationKind.Mention.toString())
            .map((user) => {
                return {
                    userId: user.UserId,
                    threadId: user.ThreadId ?? undefined,
                }
            })
        const replyToUsersTagged = new Set(
            taggedUsers
                .filter((taggedUser) => taggedUser.Tag === NotificationKind.ReplyTo.toString())
                .map((user) => user.UserId),
        )
        const reactionUsersTagged: TaggedUserWithThreadId[] = taggedUsers
            .filter((taggedUser) => taggedUser.Tag === NotificationKind.Reaction.toString())
            .map((user) => {
                return {
                    userId: user.UserId,
                    threadId: user.ThreadId ?? undefined,
                }
            })
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
        if (metionUsersTagged.length > 0) {
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

        const blockedUsers = await UserSettingsTables.getBlockedUsersByUserIds(
            notificationData.users,
        )
        notificationServiceLogger.info(
            `${notificationData.users.length} found ${blockedUsers.length} blocked users lists`,
            { blockedUsers },
        )
        for (const blockedList of blockedUsers) {
            const { userId, blockedUsers } = blockedList
            const isUserGloballyMuted = mutedUsersInChannel.has(userId)
            if (userId === notificationData.sender || (!isDMorGDM && isUserGloballyMuted)) {
                continue
            }

            const isMentionedUser = metionUsersTagged.some((u) => u.userId === userId)
            const isUserTagged =
                isDMorGDM ||
                isAtChannel ||
                isAttachmentNotifyChannel ||
                isMentionedUser ||
                replyToUsersTagged.has(userId) ||
                reactionUsersTagged.some((u) => u.userId === userId) ||
                attachmentUsersTagged.some((user) => user.UserId === userId)

            const isSenderUserBlocked = blockedUsers.includes(notificationData.sender)

            const isUserMutedForMention = isMentionedUser && mutedMentionUsers.has(userId)
            const isUserMutedForReplyTo =
                (attachmentReplyToUsers.size > 0 || replyToUsersTagged.has(userId)) &&
                mutedReplyToUsers.has(userId)
            const isUserMutedForDM =
                (attachmentDMorGDMUsers.size > 0 || isDMorGDM) && mutedDMUsers.has(userId)

            if (
                !isUserTagged ||
                isUserMutedForMention ||
                isUserMutedForReplyTo ||
                isUserMutedForDM ||
                isSenderUserBlocked
            ) {
                continue
            }

            if (reactionUsersTagged.length > 0) {
                const reactionTag = reactionUsersTagged.find((u) => u.userId === userId)
                if (reactionTag) {
                    recipients[userId] = {
                        userId,
                        kind: NotificationKind.Reaction,
                        threadId: reactionTag.threadId,
                    }
                }
            } else if (isMentionedUser) {
                recipients[userId] = {
                    userId,
                    kind: NotificationKind.Mention,
                    threadId: metionUsersTagged.find((u) => u.userId === userId)?.threadId,
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
                    threadId: attachmentUsersTagged[0].ThreadId ?? undefined,
                }
            } else {
                recipients[userId] = {
                    userId,
                    kind: notificationData.payload.content.kind,
                }
            }
        }

        const recipientsArray = Object.values(recipients)
        notificationServiceLogger.info(
            `found ${recipientsArray.length} users to notify in ${Date.now() - startTime}ms`,
            { recipientsArray, channelId },
        )
        return recipientsArray
    }

    public async createNotificationAsyncRequests(
        notificationData: NotifyUsersSchema,
        usersToNotify: NotifyUser[],
    ): Promise<Promise<SendPushResponse>[]> {
        const startTime = Date.now()
        const pushNotificationPromises: Promise<SendPushResponse>[] = []
        const isDMorGDM = notificationData.payload.content.kind === NotificationKind.DirectMessage

        for (const n of usersToNotify) {
            const payload = { ...notificationData.payload }

            let kind = n.kind

            const isAttachmentOnly = Object.values(NotificationAttachmentKind).includes(
                kind as unknown as NotificationAttachmentKind,
            )
            if (isAttachmentOnly) {
                notificationServiceLogger.info(`Attachment notification ${kind}`)
                payload.content.attachmentOnly = kind as NotificationAttachmentKind
                if (
                    isDMChannelStreamId(payload.content.channelId) ||
                    isGDMChannelStreamId(payload.content.channelId)
                ) {
                    kind = NotificationKind.DirectMessage
                } else if (isChannelStreamId(payload.content.channelId)) {
                    kind = NotificationKind.ReplyTo
                    ;(payload.content as NotificationContentMessageSchema).threadId = n.threadId
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
                    const replyToContent = payload.content as NotificationContentMessageSchema
                    replyToContent.threadId = n.threadId
                }
                payload.content.reaction = true
            }

            payload.content.kind = kind as NotificationKind

            if (!isPayloadLengthValid(JSON.stringify(payload))) {
                payload.content.event = {}
                notificationServiceLogger.warn(
                    'Payload size exceeds the limit, trimming down the payload',
                )
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
                } else if (subscription.PushType === PushType.iOS) {
                    const sendNotificationPromise = sendNotificationViaAPNS(option, subscription)
                    pushNotificationPromises.push(sendNotificationPromise)
                }
            }
        }
        notificationServiceLogger.info(
            `created ${pushNotificationPromises.length} notification requests in ${
                Date.now() - startTime
            }ms`,
        )
        return pushNotificationPromises
    }
}

export interface NotificationOptions {
    userId: string // recipient
    channelId: string
    payload: NotificationPayloadSchema
    urgency?: Urgency
}

export const notificationService = new NotificationService()
