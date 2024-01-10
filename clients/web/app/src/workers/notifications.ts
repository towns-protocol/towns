import { RoomMember, SpaceData, UserIdToMember } from 'use-zion-client'
import {
    AppNotification,
    AppNotificationType,
    NotificationContent,
    NotificationDM,
    NotificationMention,
    NotificationNewMessage,
    NotificationReplyTo,
    ServiceWorkerMessageType,
    WEB_PUSH_NAVIGATION_CHANNEL,
} from './types.d'
import { User, startDB } from '../idb/notificationsMeta'
import {
    appNotificationFromPushEvent,
    notificationContentFromEvent,
    pathFromAppNotification,
} from './notificationParsers'
import { checkClientIsVisible, getShortenedName } from './utils'

import { PlaintextDetails, decryptWithMegolm } from './mecholmDecryption'
import { env } from '../utils/environment'
import { getEncryptedData } from './data_transforms'

let idbChannels: ReturnType<typeof startDB>['idbChannels'] | undefined = undefined
let idbSpaces: ReturnType<typeof startDB>['idbSpaces'] | undefined = undefined
let idbUsers: ReturnType<typeof startDB>['idbUsers'] | undefined = undefined

function startDBWithTerminationListener() {
    return startDB({
        onTerminated: () => {
            // if terminated, we need to reset the idb stores so that the next action that involves one will re-establish a connection
            idbChannels = undefined
            idbUsers = undefined
            idbSpaces = undefined
        },
    })
}

export function handleNotifications(worker: ServiceWorkerGlobalScope) {
    const prod = !env.DEV
    if (prod) {
        console.log(`sw:push: handleNotifications() was called.`)
    }

    if (prod) {
        // print the various lifecyle / event hooks for debugging
        worker.addEventListener('install', () => {
            console.log('sw:push: "install" event')
        })

        worker.addEventListener('pushsubscriptionchange', () => {
            console.log('sw:push: "pushsubscriptionchange" event')
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        worker.addEventListener('sync', (event: any) => {
            // returns true if the user agent will not make further
            // synchronization attempts after the current attempt.
            console.log('sw:push: "sync" event, lastChance:', event.lastChance)
        })
    }

    // `activate` fires once old service worker is gone and new one has taken control
    worker.addEventListener('activate', () => {
        console.log('sw:push: "activate" event')
        startDBWithTerminationListener()
    })

    worker.addEventListener('message', async (event) => {
        console.log('sw:push: "message" event', event)
        const data: {
            type?: ServiceWorkerMessageType
            space?: SpaceData
            membersMap?: UserIdToMember
            myProfile?: RoomMember
        } = event.data

        event.waitUntil(addData())

        async function addData() {
            switch (data.type) {
                case ServiceWorkerMessageType.MyUserId:
                    if (data.myProfile?.userId) {
                        const userId = data.myProfile.userId
                        try {
                            await addMyUserIdToIdb(userId)
                        } catch (error) {
                            console.error('sw:push: error adding my userId to idb', userId, error)
                        }
                    }
                    break
                case ServiceWorkerMessageType.SpaceMetadata:
                    if (data.space) {
                        const space = data.space
                        try {
                            await Promise.all([addSpaceToIdb(space), addChannelsToIdb(space)])
                        } catch (error) {
                            console.error(
                                'sw:push: error adding space and channels to idb',
                                space,
                                error,
                            )
                        }
                    }
                    break
                case ServiceWorkerMessageType.SpaceMembers:
                    if (data.membersMap) {
                        try {
                            await addUsersToIdb(data.membersMap)
                        } catch (error) {
                            console.error(
                                'sw:push: error adding users to idb',
                                {
                                    space: data.space,
                                    membersMap: data.membersMap,
                                },
                                error,
                            )
                        }
                    }
                    break
                default:
                    console.log('sw:push: received unknown message type', data.type)
                    break
            }
        }
    })

    worker.addEventListener('push', (event) => {
        async function handleEvent(event: PushEvent) {
            console.log('sw:push: "push" event')

            const clientVisible = await checkClientIsVisible(worker)
            if (clientVisible) {
                console.log('sw:push: client is visible, not showing notification')
                return
            }

            if (!event.data) {
                console.log('sw:push: push event contains no data')
                return
            }
            const data = event.data.text() || '{}'
            console.log('sw:push: received notification', data)
            const notification = appNotificationFromPushEvent(data)

            if (!notification) {
                console.log("sw:push: ''worker couldn't parse notification")
                return
            }

            const content = await getNotificationContent(notification)
            console.log('sw:push:getNotificationContent', content)

            // options: https://developer.mozilla.org/en-US/docs/Web/API/Notification
            if (content?.title && content?.body) {
                const options: NotificationOptions = {
                    body: content.body,
                    data: JSON.stringify(content),
                    tag: notification.content.channelId,
                    silent: false,
                    icon: '/pwa/maskable_icon_x192.png',
                }
                await worker.registration.showNotification(content.title, options)
                console.log('sw:push: Notification shown')
            } else {
                console.log(
                    'sw:push: did not process notification content correctly. Something is missing',
                )
            }
        }
        event.waitUntil(handleEvent(event))
    })

    worker.addEventListener('notificationclick', (event) => {
        console.log('sw:push: Clicked on a notification', event)
        event.notification.close()
        event.waitUntil(
            worker.clients.matchAll({ type: 'window' }).then(async (clientsArr) => {
                const data = notificationContentFromEvent(event.notification.data)
                if (!data) {
                    console.log('sw:push: worker could not parse notification data')
                    return
                }
                const pathToNavigateTo = pathFromAppNotification(data)
                console.log('sw:push: pathToNavigateTo', pathToNavigateTo)

                const hadWindowToFocus = clientsArr.find((windowClient) =>
                    windowClient.url.includes(worker.location.origin),
                )

                if (hadWindowToFocus) {
                    await hadWindowToFocus.focus()
                    const navigationChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)
                    // avoid reloading the page
                    navigationChannel.postMessage({ path: pathToNavigateTo })
                } else {
                    const url = new URL(worker.location.origin)
                    url.pathname = pathToNavigateTo
                    const window = await worker.clients.openWindow(url.toString())
                    await window?.focus()
                }
            }),
        )
    })
}

function generateNewNotificationMessage(
    spaceId: string,
    townName: string | undefined,
    channelId: string,
    channelName: string | undefined,
    sender: string | undefined,
    plaintext: PlaintextDetails | undefined,
): NotificationNewMessage {
    let body = plaintext?.body
    if (!body) {
        switch (true) {
            case stringHasValue(channelName) && stringHasValue(sender):
                body = `@${sender} posted a new message in #${channelName}`
                break
            case stringHasValue(channelName) && !stringHasValue(sender):
                body = `There's a new message in #${channelName}`
                break
            case !stringHasValue(channelName) && stringHasValue(sender):
                body = `@${sender} posted a new message in ${townName}`
                break
            default:
                body = `There's a new message in ${townName}`
                break
        }
    }
    if (townName) {
        return {
            kind: AppNotificationType.NewMessage,
            spaceId,
            channelId,
            title: townName,
            body,
        }
    }
    return {
        kind: AppNotificationType.NewMessage,
        spaceId,
        channelId,
        title: '',
        body: '',
    }
}

function generateDmTitle(sender: string | undefined, recipients: User[]): string {
    console.log('sw:push: generateDmTitle INPUT', 'senderName', sender, 'recipients', recipients)
    const recipientNames = recipients
        .map((recipient) => getShortenedName(recipient.name))
        .filter((name) => name !== undefined) as string[]
    switch (true) {
        case stringHasValue(sender) && recipientNames.length === 0:
            return `${sender}`
        case stringHasValue(sender) && recipientNames.length === 1:
            return `${sender} and ${recipientNames[0]}`
        case stringHasValue(sender) && recipientNames.length === 2:
            return `${sender}, ${recipientNames[0]}, and one other`
        case stringHasValue(sender) && recipientNames.length > 2:
            return `${sender}, ${recipientNames[0]}, and ${recipientNames.length - 1} others`
        case !stringHasValue(sender) && recipientNames.length === 1:
            return `${recipientNames[0]} and one other`
        case !stringHasValue(sender) && recipientNames.length === 2:
            return `${recipientNames[0]}, ${recipientNames[1]}, and one other`
        case !stringHasValue(sender) && recipientNames.length > 2:
            return `${recipientNames[0]}, ${recipientNames[1]}, and ${
                recipientNames.length - 1
            } others`
        default:
            return 'Direct Message'
    }
}

function generateDM(
    channelId: string,
    myUserId: string | undefined,
    sender: string | undefined,
    recipients: User[] | undefined,
    plaintext: PlaintextDetails | undefined,
): NotificationDM {
    // if myUserId is available, remove it from the recipients list
    const recipientsExcludeMe =
        recipients?.filter((recipient) => (myUserId ? recipient.id !== myUserId : false)) ?? []
    const title = generateDmTitle(sender, recipientsExcludeMe)
    let body = plaintext?.body
    if (!body) {
        switch (true) {
            case stringHasValue(sender) && recipientsExcludeMe?.length === 0:
                body = `@${sender} sent you a direct message`
                break
            case stringHasValue(sender) && recipientsExcludeMe && recipientsExcludeMe.length > 1:
                body = `@${sender} sent a message in a group you’re in`
                break
            case !stringHasValue(sender) && recipientsExcludeMe?.length === 0:
                body = `You got a direct message`
                break
            case !stringHasValue(sender) && recipientsExcludeMe && recipientsExcludeMe.length > 1:
                body = `A group you’re in has a new message`
                break
            default:
                body = `You got a direct message`
                break
        }
    }
    console.log('sw:push: generateDM OUTPUT', { title, body })
    return {
        kind: AppNotificationType.DirectMessage,
        channelId,
        title,
        body,
    }
}

function generateMentionedMessage(
    spaceId: string,
    townName: string | undefined,
    channelId: string,
    channelName: string | undefined,
    sender: string | undefined,
    plaintext: PlaintextDetails | undefined,
): NotificationMention {
    let body = plaintext?.body
    if (!body) {
        switch (true) {
            case stringHasValue(channelName) && stringHasValue(sender):
                body = `@${sender} mentioned you in #${channelName}`
                break
            case stringHasValue(channelName) && !stringHasValue(sender):
                body = `You got mentioned in #${channelName}`
                break
            case !stringHasValue(channelName) && stringHasValue(sender):
                body = `@${sender} mentioned you in ${townName}`
                break
            default:
                body = `You got mentioned in ${townName}`
                break
        }
    }
    return {
        kind: AppNotificationType.Mention,
        spaceId,
        channelId,
        threadId: plaintext?.threadId,
        title: townName ?? '',
        body,
    }
}

function generateReplyToMessage(
    spaceId: string,
    townName: string | undefined,
    channelId: string,
    channelName: string | undefined,
    sender: string | undefined,
    plaintext: PlaintextDetails | undefined,
): NotificationReplyTo {
    let body = plaintext?.body
    if (!body) {
        switch (true) {
            case stringHasValue(channelName) && stringHasValue(sender):
                body = `@${sender} replied to a thread in #${channelName} that you're participating in`
                break
            case stringHasValue(channelName) && !stringHasValue(sender):
                body = `A thread in #${channelName} that you're participating in has a new reply`
                break
            case !stringHasValue(channelName) && stringHasValue(sender):
                body = `@${sender} replied to a thread that you're a part of in ${townName}`
                break
            default:
                body = `A thread you're a part of in ${townName} has a new reply`
                break
        }
    }
    return {
        kind: AppNotificationType.ReplyTo,
        spaceId,
        channelId,
        threadId: plaintext?.threadId ?? '',
        title: townName ?? '',
        body,
    }
}

async function getNotificationContent(
    notification: AppNotification,
): Promise<NotificationContent | undefined> {
    let townName: string | undefined = undefined
    let channelName: string | undefined = undefined
    let senderName: string | undefined = undefined
    let recipients: User[] = []
    let myUserId: string | undefined = undefined

    if (!idbSpaces || !idbChannels || !idbUsers) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }

    try {
        const space =
            notification.content.kind !== AppNotificationType.DirectMessage
                ? await idbSpaces.get(notification.content.spaceId)
                : undefined
        const channel = await idbChannels.get(notification.content.channelId)
        const sender = await idbUsers.get(notification.content.senderId)
        const myUser = await idbUsers.get(ServiceWorkerMessageType.MyUserId)
        myUserId = myUser?.name // this is the userId, not the displayName
        townName = space?.name
        channelName = channel?.name
        // transform the sender name to the shortened version
        senderName = getShortenedName(sender?.name)

        if (
            notification.content.kind === AppNotificationType.DirectMessage &&
            notification.content.recipients &&
            notification.content.recipients.length > 0
        ) {
            console.log('sw:push: recipients', notification.content.recipients)
            const dbUsersPromises: Promise<User | undefined>[] = []
            notification.content.recipients.forEach((recipientId) => {
                if (idbUsers) {
                    dbUsersPromises.push(idbUsers.get(recipientId))
                }
            })
            const dbUsers = await Promise.all(dbUsersPromises)
            recipients = dbUsers
                .map((user) => {
                    if (user?.id && user?.name) {
                        return user
                    }
                })
                .filter((user) => user !== undefined) as User[]
        }
    } catch (error) {
        console.error('sw:push: error fetching space/channel/user names from idb', error)
    }

    // try to decrypt, if we can't, return undefined, and the notification will be a generic message
    const plaintext = myUserId ? await tryDecryptEvent(myUserId, notification) : undefined

    switch (notification.content.kind) {
        case AppNotificationType.DirectMessage:
            return generateDM(
                notification.content.channelId,
                myUserId,
                senderName,
                recipients,
                plaintext,
            )
        case AppNotificationType.NewMessage:
            return generateNewNotificationMessage(
                notification.content.spaceId,
                townName,
                notification.content.channelId,
                channelName,
                senderName,
                plaintext,
            )
        case AppNotificationType.Mention:
            return generateMentionedMessage(
                notification.content.spaceId,
                townName,
                notification.content.channelId,
                channelName,
                senderName,
                plaintext,
            )
        case AppNotificationType.ReplyTo:
            return generateReplyToMessage(
                notification.content.spaceId,
                townName,
                notification.content.channelId,
                channelName,
                senderName,
                plaintext,
            )

        default:
            return undefined
    }
}

async function addMyUserIdToIdb(userId: string) {
    if (!idbUsers) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }
    await idbUsers.set({
        id: ServiceWorkerMessageType.MyUserId,
        name: userId,
    })
    console.log('sw:push: added my userId to idb', userId)
}

async function addSpaceToIdb(space: SpaceData) {
    if (!idbSpaces) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }
    const spaceId = space.id
    const cacheSpace = await idbSpaces.get(spaceId)

    if (!cacheSpace || cacheSpace.name !== space.name) {
        console.log('sw:push: adding space to idb', spaceId)
        await idbSpaces.set({
            id: spaceId,
            name: space.name,
        })
    }
}

async function addChannelsToIdb(space: SpaceData) {
    if (!idbChannels) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }
    const channels = space.channelGroups.flatMap((cg) => cg.channels)
    const allIdbChannelsForSpace = await idbChannels.getAllFromIndex('bySpace', space.id)

    const missingItems = channels.filter(
        (channel) => !allIdbChannelsForSpace.some((idbChannel) => idbChannel.id === channel.id),
    )
    const nameChangedItems = channels.filter((channel) =>
        allIdbChannelsForSpace.some(
            (idbChannel) => idbChannel.id === channel.id && idbChannel.name !== channel.label,
        ),
    )
    const itemsToUpdate = missingItems.concat(nameChangedItems)

    if (itemsToUpdate.length) {
        const tx = await idbChannels.transaction('readwrite')
        const store = tx.store
        await Promise.all([
            ...itemsToUpdate.map((item) =>
                store.put?.({
                    id: item.id,
                    name: item.label,
                    parentSpaceId: space.id,
                }),
            ),
            tx.done,
        ])
    }
}

function preferredName(member: RoomMember): string {
    // in order of preference: displayName -> username -> userId
    return stringHasValue(member.displayName)
        ? member.displayName
        : stringHasValue(member.username)
        ? member.username
        : member.userId
}

async function addUsersToIdb(membersMap: { [userId: string]: RoomMember | undefined }) {
    if (!idbUsers) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }
    const allIdbUsers = await idbUsers.getAll()
    // update name if the userId is missing; or if the name is different
    const updateNames = Object.values(membersMap)
        .filter(
            (member) =>
                member &&
                !allIdbUsers.some(
                    (idbUser) =>
                        idbUser.id === member.userId && idbUser.name === preferredName(member),
                ),
        )
        .filter((member) => member !== undefined) as RoomMember[]
    if (updateNames.length) {
        const tx = await idbUsers.transaction('readwrite')
        const store = tx.store
        await Promise.all([
            ...updateNames.map(async (member) => {
                const name = preferredName(member)
                await store.put?.({
                    name,
                    id: member.userId,
                })
            }),
            tx.done,
        ])
    }
}

function stringHasValue(s: string | undefined): boolean {
    return s !== undefined && s.length > 0
}

async function tryDecryptEvent(
    userId: string,
    notification: AppNotification,
): Promise<PlaintextDetails | undefined> {
    console.log('sw:push: tryDecryptEvent', userId, notification)
    if (!userId) {
        return undefined
    }

    const { event, channelId } = notification.content
    let plaintext: PlaintextDetails | undefined
    let cancelTimeout: () => void

    const timeoutPromise = new Promise<void>((resolve, reject) => {
        // if the decryption takes too long, reject the promise
        const timeout = setTimeout(() => {
            console.log('sw:push: timed out waiting for decryption')
            cancelTimeout = () => {}
            reject(new Error('Timed out waiting for decryption'))
        }, 1000)
        cancelTimeout = () => {
            clearTimeout(timeout)
            resolve()
        }
    })

    // attempt to decrypt the data
    const decryptPromise = async function () {
        try {
            console.log('sw:push: tryDecryptEvent', event)
            const encryptedData = getEncryptedData(event)
            plaintext = await decryptWithMegolm(userId, channelId, encryptedData)
            console.log(`sw:push: decryptWithMegolm returns "${plaintext}"`)
            return plaintext
        } catch (error) {
            console.error('sw:push: error decrypting', error)
            return undefined
        } finally {
            cancelTimeout()
        }
    }

    try {
        await Promise.race([decryptPromise(), timeoutPromise])
    } catch (error) {
        console.error('sw:push: error decrypting event', error)
    }

    console.log(`sw:push: tryDecryptEvent result: "${plaintext}"`)
    return plaintext
}
