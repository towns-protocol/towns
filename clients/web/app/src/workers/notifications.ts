import * as emoji from 'node-emoji'

import { dlog, dlogError } from '@towns-protocol/dlog'
import { EncryptedData } from '@towns-protocol/proto'

import {
    EncryptedContent,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    spaceIdFromChannelId,
} from '@towns-protocol/sdk'
import { UserRecord } from 'store/notificationSchema'
import { getDDLogApiURL } from '../datadog'
import {
    AppNotification,
    NotificationContent,
    NotificationKind,
    WEB_PUSH_NAVIGATION_CHANNEL,
    WEB_PUSH_SUBSCRIPTIONS_CHANNEL,
} from './types.d'
import { PlaintextDetails, decrypt } from './decryptionFn'
import {
    appNotificationFromPushEvent,
    notificationContentFromEvent,
    pathFromAppNotification,
} from './notificationParsers'
import { checkClientIsVisible, getShortenedName, stringHasValue } from './utils'

import { CurrentUser, NotificationCurrentUser } from '../store/notificationCurrentUser'
import { NotificationStore } from '../store/notificationStore'
import { env } from '../utils/environment'
import {
    getEncryptedData,
    getPlaintextDetailsForNonEncryptedEvents,
    getSenderIdOverride,
    htmlToText,
} from './data_transforms'
import { NotificationRelEntry, getPathnameWithParams, getUrlWithParams } from '../data/rel'

const MIDDLE_DOT = '\u00B7'
const log = dlog('sw:push')
const logError = dlogError('sw:push')

interface PushSubscriptionChangeEvent extends ExtendableEvent {
    readonly newSubscription: PushSubscription | null
    readonly oldSubscription: PushSubscription | null
}

const notificationStores: Record<string, NotificationStore> = {}
let currentUserStore: NotificationCurrentUser | undefined = undefined

async function getCurrentUserStore(): Promise<NotificationCurrentUser> {
    if (!currentUserStore) {
        currentUserStore = new NotificationCurrentUser()
    }
    return currentUserStore
}

async function getCurrentUser(): Promise<CurrentUser> {
    const currentUserStore = await getCurrentUserStore()
    const currentUser = await currentUserStore.getCurrentUserRecord()
    return (
        currentUser ?? {
            userId: '',
            databaseName: '',
            notificationClickedTimestamp: 0,
        }
    )
}

// initialize the current user's notification store
// which allows us to map the ids in the notification to the names
async function initCurrentUserNotificationStore(): Promise<
    { userId: string; databaseName: string } | undefined
> {
    // if the notificationStore is not initialized, initialize it
    const { userId, databaseName } = await getCurrentUser()
    log('currentUser', {
        userId: userId ? userId : 'undefined',
        databaseName: databaseName ? databaseName : 'undefined',
    })
    if (userId) {
        if (notificationStores[userId] === undefined) {
            notificationStores[userId] = new NotificationStore(userId)
        }
        await notificationStores[userId].open()
        log('new currentUser', {
            userId: userId ? userId : 'undefined',
            databaseName: databaseName ? databaseName : 'undefined',
        })
        return {
            userId,
            databaseName,
        }
    } else {
        log('no currentUser in NotificationCurrentUser')
    }
    return undefined
}

const sendLogToDatadog = async (
    level: 'debug' | 'info' | 'error' | 'warn',
    message: string,
    metadata?: Record<string, unknown>,
) => {
    const url = getDDLogApiURL()
    if (!url) {
        log('Datadog API URL not available')
        return
    }
    const currentUser = await initCurrentUserNotificationStore()
    const body = JSON.stringify({
        status: level,
        message: message,
        metadata: { ...(metadata ?? {}), currentUser }, // Add more metadata fields if necessary
    })

    try {
        const res = await fetch(url, {
            method: 'POST',
            keepalive: true, // Finish even if the browser is closing
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8',
            } as HeadersInit,
            body,
            mode: 'cors',
        })
        log('Log sent to Datadog:', { level, message, metadata, response: res })
    } catch (error) {
        logError('Failed to send log to Datadog:', error)
    }
}

export function handleNotifications(worker: ServiceWorkerGlobalScope) {
    const prod = !env.DEV

    if (prod) {
        sendLogToDatadog('info', 'handleNotifications() was called')
    }
    log(`handleNotifications() was called.`)

    // print the various lifecycle / event hooks for debugging
    worker.addEventListener('install', () => {
        log('"install" event')
    })

    worker.addEventListener('pushsubscriptionchange', (event) => {
        log('"pushsubscriptionchange" event')
        // dispatch an event to the main thread
        const subscriptionsChannel = new BroadcastChannel(WEB_PUSH_SUBSCRIPTIONS_CHANNEL)
        subscriptionsChannel.postMessage({
            oldSubscription: (event as PushSubscriptionChangeEvent).oldSubscription,
            newSubscription: (event as PushSubscriptionChangeEvent).newSubscription,
        })
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worker.addEventListener('sync', (event: any) => {
        // returns true if the user agent will not make further
        // synchronization attempts after the current attempt.
        log('"sync" event, lastChance:', event.lastChance)
    })

    // `activate` fires once old service worker is gone and new one has taken control
    worker.addEventListener('activate', async () => {
        log('"activate" event')
        await initCurrentUserNotificationStore()
    })

    worker.addEventListener('push', (event) => {
        async function handleEvent(event: PushEvent) {
            log('"push" event')
            const clientVisible = await checkClientIsVisible(worker)
            if (clientVisible) {
                await sendLogToDatadog('info', 'Client is visible, not showing notification')
                log('client is visible, not showing notification')
                return
            }

            if (!event.data) {
                log('push event contains no data')
                return
            }
            const data = event.data.text() || '{}'
            log('received notification', data)
            const notification = appNotificationFromPushEvent(data)

            if (!notification) {
                await sendLogToDatadog('warn', "worker couldn't parse notification")
                log("sw:push: ''worker couldn't parse notification")
                return
            }

            const content = await getNotificationContent(notification)
            log('getNotificationContent', content)

            // options: https://developer.mozilla.org/en-US/docs/Web/API/Notification
            if (content?.title && content?.body) {
                const options: NotificationOptions = {
                    body: content.body,
                    data: JSON.stringify(content),
                    tag: notification.content.channelId,
                    silent: false,
                    icon: getNotificationIcon(self.location.origin, notification),
                }
                await worker.registration.showNotification(content.title, options)
                await sendLogToDatadog('info', 'Notification shown', { content })
                log('Notification shown')
            } else {
                log(
                    'notification content not shown because it has one or more undefined values after processing',
                )
            }
        }
        event.waitUntil(handleEvent(event))
    })

    worker.addEventListener('notificationclick', (event) => {
        log('Clicked on a notification', event)
        event.notification.close()
        event.waitUntil(
            worker.clients.matchAll({ type: 'window' }).then(async (clientsArr) => {
                const data = notificationContentFromEvent(event.notification.data)
                if (!data) {
                    await sendLogToDatadog('warn', 'worker could not parse notification data', {
                        data: event.notification.data,
                    })
                    logError('worker could not parse notification data', 'notificationData', {
                        data: event.notification.data ?? 'undefined',
                    })
                    return
                }

                const hadWindowToFocus = clientsArr.find((windowClient) =>
                    windowClient.url.includes(worker.location.origin),
                )

                const currentUserStore = await getCurrentUserStore()
                const { notificationUrl, spaceId, channelId, threadId } =
                    pathFromAppNotification(data)
                if (hadWindowToFocus) {
                    // update the path with specific search params
                    const url = getPathnameWithParams(
                        new URL(worker.location.origin),
                        notificationUrl,
                        NotificationRelEntry.BroadcastChannel,
                        data.kind,
                    )
                    log('[route] service worker posting message to broadcast channel', {
                        path: url,
                        hadWindowToFocus: true,
                    })
                    // work around for hnt-5685
                    await currentUserStore.setNotificationClicked({
                        notificationUrl: url,
                        spaceId,
                        channelId,
                        threadId,
                    })
                    await hadWindowToFocus.focus()
                    const navigationChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)
                    // avoid reloading the page
                    navigationChannel.postMessage({ path: url, spaceId, channelId, threadId })
                    await sendLogToDatadog('info', 'Broadcast navigation event', {
                        path: url,
                        spaceId,
                        channelId,
                        threadId,
                    })
                } else {
                    // update the path with specific search params
                    const url = getUrlWithParams(
                        new URL(worker.location.origin),
                        notificationUrl,
                        NotificationRelEntry.OpenWindow,
                        data.kind,
                    )
                    log('[route]] service worker opening browser window', {
                        path: url.toString(),
                        hadWindowToFocus: false,
                    })
                    // work around for hnt-5685
                    await currentUserStore.setNotificationClicked({
                        notificationUrl: url.pathname + url.search,
                        spaceId,
                        channelId,
                        threadId,
                    })
                    const window = await worker.clients.openWindow(url.toString())
                    await window?.focus()
                    await sendLogToDatadog('info', 'Opened browser window', {
                        path: url,
                        spaceId,
                        channelId,
                        threadId,
                    })
                }
            }),
        )
    })
}

function generateNewNotificationMessage({
    kind,
    spaceId,
    townName,
    channelId,
    threadId,
    channelName,
    senderName,
    plaintext,
}: {
    kind: NotificationKind
    spaceId: string
    townName: string | undefined
    channelId: string
    threadId: string | undefined
    channelName: string | undefined
    senderName: string | undefined
    plaintext: PlaintextDetails | undefined
}): NotificationContent {
    const title = generateMentionTitle(senderName, townName, channelName)
    let body = plaintext?.body
    if (!body) {
        switch (true) {
            case stringHasValue(channelName) && stringHasValue(senderName):
                body = `@${senderName} posted a new message in #${channelName}`
                break
            case stringHasValue(channelName) && !stringHasValue(senderName):
                body = `There's a new message in #${channelName}`
                break
            case !stringHasValue(channelName) && stringHasValue(senderName):
                body = `@${senderName} posted a new message in ${townName}`
                break
            default:
                body = `There's a new message in ${townName}`
                break
        }
    }
    return {
        kind,
        spaceId,
        channelId,
        threadId,
        title,
        body,
    }
}

function generateDmTitle(
    sender: string | undefined,
    recipients: UserRecord[],
    dmChannelName: string | undefined,
): string {
    log('generateDmTitle INPUT', 'senderName', sender, 'recipients', recipients)
    const recipientNames = recipients
        .map((recipient) => getShortenedName(recipient.name))
        .filter((name) => name !== undefined && name !== sender) as string[]
    switch (true) {
        case stringHasValue(sender) && stringHasValue(dmChannelName):
            return `${sender} ${MIDDLE_DOT} ${dmChannelName}`
        case stringHasValue(sender) && recipientNames.length === 0:
            return `${sender}`
        case stringHasValue(sender) && recipientNames.length === 1:
            return `${sender} ${MIDDLE_DOT} ${recipientNames[0]}`
        case stringHasValue(sender) && recipientNames.length === 2:
            return `${sender} ${MIDDLE_DOT} ${recipientNames[0]}, and one other`
        case stringHasValue(sender) && recipientNames.length > 2:
            return `${sender} ${MIDDLE_DOT} ${recipientNames[0]}, and ${
                recipientNames.length - 1
            } others`
        case !stringHasValue(sender) && stringHasValue(dmChannelName):
            return `${dmChannelName}`
        case !stringHasValue(sender) && recipientNames.length === 1:
            return `${recipientNames[0]}`
        case !stringHasValue(sender) && recipientNames.length === 2:
            return `${recipientNames[0]}, ${recipientNames[1]}`
        case !stringHasValue(sender) && recipientNames.length > 2:
            return `${recipientNames[0]}, ${recipientNames[1]}, and ${
                recipientNames.length - 2
            } others`
        default:
            return 'Direct Message'
    }
}

function generateDM(
    kind: NotificationKind,
    channelId: string,
    dmChannelName: string | undefined,
    myUserId: string | undefined,
    sender: string | undefined,
    recipients: UserRecord[] | undefined,
    plaintext: PlaintextDetails | undefined,
    reaction?: boolean,
): NotificationContent {
    // if myUserId is available, remove it from the recipients list
    const recipientsExcludeMe =
        recipients?.filter((recipient) => (myUserId ? recipient.id !== myUserId : false)) ?? []
    const title = generateDmTitle(sender, recipientsExcludeMe, dmChannelName)
    let body = plaintext?.body
    if (!body) {
        // always show something to avoid getting throttled
        // if there's no body, use the default message
        body =
            recipientsExcludeMe.length === 0
                ? 'You got a direct message'
                : 'A group you’re in has a new message'
    }
    log('generateDM INPUT', 'plaintext', plaintext)
    const reactionEmoji = plaintext?.reaction ? emoji.get(plaintext.reaction) : undefined
    if (reaction || reactionEmoji) {
        const senderText = stringHasValue(sender) ? `@${sender}` : 'Someone'

        let reactText = 'reacted'
        if (reactionEmoji) {
            reactText = `reacted: ${reactionEmoji}`
        }
        const defaultChannelName =
            recipientsExcludeMe.length === 0 ? 'a direct message' : 'a group you’re in'
        const formattedChannelName = stringHasValue(dmChannelName)
            ? `#${dmChannelName}`
            : defaultChannelName

        body = `${senderText} ${reactText} to your message in ${formattedChannelName}`
    }
    log('generateDM OUTPUT', { title, body })
    return {
        kind,
        channelId,
        title,
        body,
    }
}

function generateMentionTitle(
    sender: string | undefined,
    townName: string | undefined,
    channelName: string | undefined,
): string {
    if (sender && townName && channelName) {
        return `${sender} ${MIDDLE_DOT} #${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (sender && townName && !channelName) {
        return `${sender} ${MIDDLE_DOT} ${townName}`
    } else if (sender && !townName && channelName) {
        return `${sender} ${MIDDLE_DOT} #${channelName}`
    } else if (!sender && townName && channelName) {
        return `#${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (!sender && townName && !channelName) {
        return `${townName}`
    } else if (!sender && !townName && channelName) {
        return `#${channelName}`
    } else {
        return 'New message'
    }
}

function generateMentionedMessage({
    kind,
    spaceId,
    townName,
    channelId,
    threadId,
    channelName,
    senderName,
    plaintext,
}: {
    kind: NotificationKind
    spaceId: string
    townName: string | undefined
    channelId: string
    channelName: string | undefined
    threadId: string | undefined
    senderName: string | undefined
    plaintext: PlaintextDetails | undefined
}): NotificationContent {
    const title = generateMentionTitle(senderName, townName, channelName)
    let body = plaintext?.body
    if (!body) {
        switch (true) {
            case stringHasValue(channelName) && stringHasValue(senderName):
                body = `@${senderName} mentioned you in #${channelName}`
                break
            case stringHasValue(channelName) && !stringHasValue(senderName):
                body = `You got mentioned in #${channelName}`
                break
            case !stringHasValue(channelName) && stringHasValue(senderName):
                body = `@${senderName} mentioned you in ${townName}`
                break
            default:
                body = `You got mentioned in ${townName}`
                break
        }
    }
    return {
        kind,
        spaceId,
        channelId,
        threadId,
        title,
        body,
    }
}

function generateReplyToTitle(
    sender: string | undefined,
    townName: string | undefined,
    channelName: string | undefined,
): string {
    log('generateReplyToTitle', 'sender', sender, 'townName', townName, 'channelName', channelName)
    if (sender && townName && channelName) {
        return `${sender} replied ${MIDDLE_DOT} #${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (sender && townName && !channelName) {
        return `${sender} replied ${MIDDLE_DOT} ${townName}`
    } else if (sender && !townName && channelName) {
        return `${sender} replied ${MIDDLE_DOT} #${channelName}`
    } else if (!sender && townName && channelName) {
        return `#${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (!sender && townName && !channelName) {
        return `${townName}`
    } else if (!sender && !townName && channelName) {
        return `#${channelName}`
    } else {
        return 'New reply'
    }
}

function generateTipTitle(
    sender: string | undefined,
    townName: string | undefined,
    channelName: string | undefined,
): string {
    log('generateTipTitle', 'sender', sender, 'townName', townName, 'channelName', channelName)
    if (sender && townName && channelName) {
        return `${sender} tipped ${MIDDLE_DOT} #${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (sender && townName && !channelName) {
        return `${sender} tipped ${MIDDLE_DOT} ${townName}`
    } else if (sender && !townName && channelName) {
        return `${sender} tipped ${MIDDLE_DOT} #${channelName}`
    } else if (!sender && townName && channelName) {
        return `#${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (!sender && townName && !channelName) {
        return `Received tip in ${townName}`
    } else if (!sender && !townName && channelName) {
        return `Received tip in #${channelName}`
    } else {
        return 'Received tip'
    }
}

function generateTradeTitle(
    sender: string | undefined,
    townName: string | undefined,
    channelName: string | undefined,
): string {
    log('generateTradeTitle', 'sender', sender, 'townName', townName, 'channelName', channelName)
    if (sender && townName && channelName) {
        return `${sender} traded ${MIDDLE_DOT} #${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (sender && townName && !channelName) {
        return `${sender} traded ${MIDDLE_DOT} ${townName}`
    } else if (sender && !townName && channelName) {
        return `${sender} traded ${MIDDLE_DOT} #${channelName}`
    } else if (!sender && townName && channelName) {
        return `#${channelName} ${MIDDLE_DOT} ${townName}`
    } else if (!sender && townName && !channelName) {
        return `Trade in ${townName}`
    } else if (!sender && !townName && channelName) {
        return `Trade in #${channelName}`
    } else {
        return 'Trade'
    }
}

interface ReplyToMessageInput {
    kind: NotificationKind
    spaceId: string
    townName: string | undefined
    channelId: string
    channelName: string | undefined
    senderName: string | undefined
    plaintext: PlaintextDetails | undefined
    reaction?: boolean
    threadId?: string
}

function generateReplyToMessage({
    kind,
    spaceId,
    townName,
    channelId,
    channelName,
    senderName,
    plaintext,
    reaction,
    threadId,
}: ReplyToMessageInput): NotificationContent {
    const title = generateReplyToTitle(senderName, townName, channelName)
    let body = plaintext?.body
    const refEventId = plaintext?.refEventId
    if (reaction) {
        const senderText = stringHasValue(senderName) ? `@${senderName}` : 'Someone'

        const reactionEmoji = emoji.get(plaintext?.reaction ?? '')
        let reactText = 'reacted'
        if (reactionEmoji) {
            reactText = `reacted: ${reactionEmoji}`
        }

        const formattedChannelName = stringHasValue(channelName)
            ? `#${channelName}`
            : `a channel you're in`

        body = `${senderText} ${reactText} to your post in ${formattedChannelName}`
    } else if (!body) {
        switch (true) {
            case stringHasValue(channelName) && stringHasValue(senderName):
                body = `@${senderName} replied to a thread in #${channelName} that you're participating in`
                break
            case stringHasValue(channelName) && !stringHasValue(senderName):
                body = `A thread in #${channelName} that you're participating in has a new reply`
                break
            case !stringHasValue(channelName) && stringHasValue(senderName):
                body = `@${senderName} replied to a thread that you're a part of in ${townName}`
                break
            default:
                body = `A thread you're a part of in ${townName} has a new reply`
                break
        }
    }
    return {
        kind,
        spaceId,
        channelId,
        threadId,
        title,
        body,
        refEventId,
    }
}

function generateTipMessage(args: {
    kind: NotificationKind.Tip
    spaceId: string
    townName: string | undefined
    channelId: string
    channelName: string | undefined
    senderId: string
    senderName: string | undefined
    threadId: string | undefined
    refEventId: string | undefined
}): NotificationContent {
    const title = generateTipTitle(args.senderName, args.townName, args.channelName)
    const senderText = stringHasValue(args.senderName) ? `@${args.senderName}` : 'Someone'
    const formattedChannelName = stringHasValue(args.channelName)
        ? `#${args.channelName}`
        : `a channel you're in`
    const body = `${senderText} tipped your post in ${formattedChannelName}`
    return {
        kind: args.kind,
        spaceId: args.spaceId,
        channelId: args.channelId,
        threadId: args.threadId,
        title,
        body,
        refEventId: args.refEventId,
    }
}

function generateTradeMessage(args: {
    kind: NotificationKind.Trade
    spaceId: string
    townName: string | undefined
    channelId: string
    channelName: string | undefined
    senderId: string
    senderName: string | undefined
    threadId: string | undefined
    refEventId: string | undefined
}): NotificationContent {
    const title = generateTradeTitle(args.senderName, args.townName, args.channelName)
    const senderText = stringHasValue(args.senderName) ? `@${args.senderName}` : 'Someone'
    const formattedChannelName = stringHasValue(args.channelName)
        ? `#${args.channelName}`
        : `a channel you're in`
    const body = `${senderText} traded in ${formattedChannelName}`
    return {
        kind: args.kind,
        spaceId: args.spaceId,
        channelId: args.channelId,
        threadId: args.threadId,
        title,
        body,
        refEventId: args.refEventId,
    }
}

async function getNotificationContent(
    notification: AppNotification,
): Promise<NotificationContent | undefined> {
    let townName: string | undefined
    let channelName: string | undefined
    let dmChannelName: string | undefined
    let senderName: string | undefined
    let recipients: UserRecord[] = []
    let currentUserId: string | undefined
    let currentUserDatabaseName: string | undefined

    const kind = notification.content.kind
    const currentUser = await initCurrentUserNotificationStore()
    currentUserId = currentUser?.userId
    currentUserDatabaseName = currentUser?.databaseName
    const notificationStore = currentUserId ? notificationStores[currentUserId] : undefined

    const [space, dmChannel, channel, sender] = await Promise.all([
        notification.content.spaceId // space is only needed for non-DM notifications
            ? notificationStore?.getSpace(notification.content.spaceId)
            : undefined,
        isDMChannelStreamId(notification.content.channelId) ||
        isGDMChannelStreamId(notification.content.channelId) // dmChannel is only needed for DM notifications
            ? notificationStore?.getDmChannel(notification.content.channelId)
            : undefined,
        notificationStore?.getChannel(notification.content.channelId),
        notificationStore?.getUser(
            getSenderIdOverride(notification.content.event) ?? notification.content.senderId,
        ),
    ])
    try {
        townName = space?.name
        dmChannelName = dmChannel?.name
        channelName = channel?.name
        if (channelName === notification.content.channelId) {
            channelName = undefined // make sure notification doesn't show the channel id as channel name
        }
        // transform the sender name to the shortened version
        senderName = getShortenedName(sender?.name)

        if (
            dmChannel &&
            notification.content.recipients &&
            notification.content.recipients.length > 0
        ) {
            log('recipients', notification.content.recipients)
            const dbUsersPromises: Promise<UserRecord | undefined>[] = []
            notification.content.recipients.forEach((recipientId) => {
                if (notificationStore) {
                    dbUsersPromises.push(notificationStore.getUser(recipientId))
                }
            })
            const dbUsers = await Promise.all(dbUsersPromises)
            recipients = dbUsers
                .map((user) => {
                    if (user?.id && user?.name) {
                        return user
                    }
                })
                .filter((user) => user !== undefined) as UserRecord[]
        }
    } catch (error) {
        logError('error fetching space/channel/user names from notification store', error)
        // there may be a problem reading from the notification store, so we'll
        // reset the cache and try again
        if (currentUserId) {
            delete notificationStores[currentUserId]
        }
        // reinitialize the notification store, and see if we can get the userId and databaseName
        const currentUser = await initCurrentUserNotificationStore()
        currentUserId = currentUser?.userId
        currentUserDatabaseName = currentUser?.databaseName
    }

    // try to decrypt, if we can't, return undefined, and the notification will be a generic message
    log('currentUserId before calling tryDecryptEvent', currentUserId)
    const plaintext =
        currentUserId && currentUserDatabaseName
            ? await tryDecryptEvent(currentUserId, currentUserDatabaseName, notification)
            : undefined

    if (dmChannel) {
        // dms and gdms
        return generateDM(
            kind,
            notification.content.channelId,
            dmChannelName,
            currentUserId,
            senderName,
            recipients,
            plaintext,
        )
    }
    const spaceId =
        notification.content.spaceId ?? spaceIdFromChannelId(notification.content.channelId)

    if (kind === NotificationKind.Mention) {
        return generateMentionedMessage({
            kind,
            spaceId,
            townName,
            channelId: notification.content.channelId,
            threadId: notification.content.threadId,
            channelName,
            senderName,
            plaintext,
        })
    } else if (kind === NotificationKind.Tip) {
        return generateTipMessage({
            kind,
            spaceId,
            townName,
            channelId: notification.content.channelId,
            channelName,
            senderId: notification.content.senderId,
            senderName,
            threadId: notification.content.threadId,
            refEventId: plaintext?.refEventId,
        })
    } else if (kind === NotificationKind.Trade) {
        return generateTradeMessage({
            kind,
            spaceId,
            townName,
            channelId: notification.content.channelId,
            channelName,
            senderId: notification.content.senderId,
            senderName,
            threadId: notification.content.threadId,
            refEventId: plaintext?.refEventId,
        })
    } else if (notification.content.threadId || kind === NotificationKind.Reaction) {
        return generateReplyToMessage({
            kind,
            spaceId,
            townName,
            channelId: notification.content.channelId,
            channelName,
            senderName,
            plaintext,
            reaction: kind === NotificationKind.Reaction,
            threadId: notification.content.threadId,
        })
    }
    return generateNewNotificationMessage({
        kind,
        spaceId,
        townName,
        channelId: notification.content.channelId,
        threadId: notification.content.threadId,
        channelName,
        senderName,
        plaintext,
    })
}

async function tryDecryptEvent(
    userId: string,
    databaseName: string,
    notification: AppNotification,
): Promise<PlaintextDetails | undefined> {
    log('tryDecryptEvent', userId, notification)
    if (!userId) {
        return undefined
    }
    if (!notification.content.event) {
        return undefined
    }

    const { event, channelId } = notification.content
    const encryptedData = getEncryptedData(event)
    if (!encryptedData) {
        return getPlaintextDetailsForNonEncryptedEvents(event)
    }

    let plaintext: PlaintextDetails | undefined
    let cancelTimeout: () => void

    const timeoutPromise = new Promise<void>((resolve, reject) => {
        // if the decryption takes too long, reject the promise
        const timeout = setTimeout(() => {
            log('timed out waiting for decryption')
            cancelTimeout = () => {}
            reject(new Error('Timed out waiting for decryption'))
        }, 1000)
        cancelTimeout = () => {
            clearTimeout(timeout)
            resolve()
        }
    })

    // attempt to decrypt the data
    const decryptPromise = async function (
        kind: EncryptedContent['kind'],
        encryptedData: EncryptedData,
    ) {
        try {
            log('tryDecryptEventPromise', event)
            plaintext = await decrypt(userId, databaseName, channelId, kind, encryptedData)
            log('decrypted plaintext', plaintext)
            return plaintext
        } catch (error) {
            logError('error decrypting', error)
            return undefined
        } finally {
            cancelTimeout()
        }
    }

    try {
        await Promise.race([decryptPromise(encryptedData.kind, encryptedData.data), timeoutPromise])
        if (plaintext) {
            plaintext.refEventId = encryptedData.data.refEventId
            plaintext.body = htmlToText(plaintext.body)
            log('plaintext', { plaintext: plaintext.body, refEventId: plaintext.refEventId })
        }
    } catch (error) {
        logError('error decrypting event', error)
    }

    log('tryDecryptEvent result:', plaintext)
    return plaintext
}

function getNotificationIcon(
    origin: string | undefined,
    _notification: AppNotification,
): string | undefined {
    if (!origin) {
        return undefined
    }
    try {
        const originUrl = new URL(origin)
        const host = originUrl.hostname
        let href = 'favicon.png'
        if (host === 'app.alpha.towns.com') {
            href = '/favicon-teal.png'
        } else if (host === 'app.gamma.towns.com') {
            href = '/favicon-blue.png'
        } else if (host === 'app.delta.towns.com') {
            href = '/favicon-brown.png'
        } else if (host === 'fast-app.towns.com') {
            href = '/favicon-black.png'
        } else if (host === 'localhost') {
            href = '/favicon-green.png'
        }
        const value = originUrl.protocol + '//' + originUrl.host + href
        log('getNotificationIcon', { value })
        return value
    } catch (error) {
        logError('error getting notification icon', error)
        return undefined
    }
}
