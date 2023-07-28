import { RoomMember, SpaceData, UserIdToMember } from 'use-zion-client'
import {
    AppNotification,
    AppNotificationType,
    ServiceWorkerMessageType,
    WEB_PUSH_NAVIGATION_CHANNEL,
} from './types.d'

import { appNotificationFromPushEvent, pathFromAppNotification } from './notificationParsers'
import { env } from '../utils/environment'
import { getServiceWorkerMuteSettings } from '../store/useMuteSettings'
import { startDB } from '../idb/notificationsMeta'

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
    const prod = !env.IS_DEV
    if (prod) {
        console.log(`sw: handleNotifications() was called.`)
    }
    const navigationChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)

    if (prod) {
        // print the various lifecyle / event hooks for debugging
        worker.addEventListener('install', () => {
            console.log('sw: "install" event')
        })

        worker.addEventListener('pushsubscriptionchange', () => {
            console.log('sw: "pushsubscriptionchange" event')
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        worker.addEventListener('sync', (event: any) => {
            // returns true if the user agent will not make further
            // synchronization attempts after the current attempt.
            console.log('sw: "sync" event, lastChance:', event.lastChance)
        })
    }

    // `activate` fires once old service worker is gone and new one has taken control
    worker.addEventListener('activate', () => {
        console.log('sw: "activate" event')
        startDBWithTerminationListener()
    })

    worker.addEventListener('message', async (event) => {
        console.log('sw: "message" event')
        const data: {
            type?: ServiceWorkerMessageType
            space?: SpaceData
            membersMap?: UserIdToMember
        } = event.data

        switch (data.type) {
            case ServiceWorkerMessageType.SpaceMetadata:
                if (data.space) {
                    const space = data.space
                    try {
                        await addSpaceToIdb(space)
                    } catch (error) {
                        console.error('sw: error adding space to idb', space, error)
                    }
                    try {
                        await addChannelsToIdb(space)
                    } catch (error) {
                        console.error('sw: error adding channels to idb', space, error)
                    }
                }
                break
            case ServiceWorkerMessageType.SpaceMembers:
                if (data.membersMap) {
                    try {
                        await addUsersToIdb(data.membersMap)
                    } catch (error) {
                        console.error(
                            'sw: error adding users to idb',
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
                console.log('sw: received unknown message type', data.type)
                break
        }
    })

    worker.addEventListener('push', (event) => {
        async function handleEvent(event: PushEvent) {
            console.log('sw: "push" event')
            if (!event.data) {
                console.log('sw: push event contains no data')
                return
            }
            const data = event.data.text() || '{}'
            console.log('sw: received notification', data)
            const notification = appNotificationFromPushEvent(data)

            if (!notification) {
                console.log("sw: ''worker couldn't parse notification")
                return
            }

            const { mutedChannels, mutedSpaces } = await getServiceWorkerMuteSettings()

            if (mutedSpaces[notification.content.spaceId]) {
                console.log('sw: Space is muted, not showing notification')
                return
            }

            if (mutedChannels[notification.content.channelId]) {
                console.log('sw: Channel is muted, not showing notification')
                return
            }

            const { title, body } = await getNotificationContent(notification)
            // options: https://developer.mozilla.org/en-US/docs/Web/API/Notification
            const options: NotificationOptions = {
                body,
                silent: false,
                icon: '/pwa/maskable_icon_x192.png',
                data,
                tag: notification.content.channelId,
            }
            await worker.registration.showNotification(title, options)
        }
        event.waitUntil(handleEvent(event))
        console.log('sw: Notification shown')
    })

    worker.addEventListener('notificationclick', (event) => {
        console.log('sw: Clicked on a notification', event)
        event.notification.close()
        event.waitUntil(
            worker.clients.matchAll({ type: 'window' }).then(async (clientsArr) => {
                const data = appNotificationFromPushEvent(event.notification.data)
                if (!data) {
                    console.log('sw: worker could not parse notification data')
                    return
                }
                const url = new URL(worker.location.origin)
                url.pathname = pathFromAppNotification(data)

                const hadWindowToFocus = clientsArr.find((windowClient) =>
                    windowClient.url.includes(worker.location.origin),
                )

                if (hadWindowToFocus) {
                    await hadWindowToFocus.focus()
                    // avoid reloading the page
                    navigationChannel.postMessage(event.notification.data)
                } else {
                    const window = await worker.clients.openWindow(url.toString())
                    await window?.focus()
                }
            }),
        )
    })
}

function generateNewNotificationMessage(
    townName: string | undefined,
    channelName: string | undefined,
    sender: string | undefined,
) {
    let body = ''
    switch (true) {
        case stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} posted a new message in #${channelName}`
            break
        case stringHasValue(channelName) && !stringHasValue(sender):
            body = `You've received a new message in #${channelName}`
            break
        case !stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} posted a new message`
            break
        default:
            body = `You've received a new message`
            break
    }
    return {
        title: townName ?? 'Town',
        body,
    }
}

function generateMentionedMessage(
    townName: string | undefined,
    channelName: string | undefined,
    sender: string | undefined,
) {
    let body = ''
    switch (true) {
        case stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} mentioned you in #${channelName}`
            break
        case stringHasValue(channelName) && !stringHasValue(sender):
            body = `You were mentioned in #${channelName}`
            break
        case !stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} mentioned you`
            break
        default:
            body = 'You were mentioned'
            break
    }
    return {
        title: townName ?? 'Town',
        body,
    }
}

function generateReplyToMessage(
    townName: string | undefined,
    channelName: string | undefined,
    sender: string | undefined,
) {
    let body = ''
    switch (true) {
        case stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} replied to a thread in #${channelName} that you are participating in`
            break
        case stringHasValue(channelName) && !stringHasValue(sender):
            body = `A thread in #${channelName} that you are participating in has a new reply`
            break
        case !stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} replied to a thread that you are participating in`
            break
        default:
            body = 'A thread you are participating in has a new reply'
            break
    }
    return {
        title: townName ?? 'Town',
        body,
    }
}

async function getNotificationContent(notification: AppNotification): Promise<{
    title: string
    body: string
}> {
    let townName: string | undefined = undefined
    let channelName: string | undefined = undefined
    let senderName: string | undefined = undefined

    if (!idbSpaces || !idbChannels || !idbUsers) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }

    try {
        const space = await idbSpaces.get(notification.content.spaceId)
        const channel = await idbChannels.get(notification.content.channelId)
        const sender = await idbUsers.get(notification.content.senderId)

        townName = space?.name
        channelName = channel?.name
        senderName = sender?.name
    } catch (error) {
        console.error('sw: error fetching space/channel name from idb', error)
    }

    switch (notification.notificationType) {
        case AppNotificationType.NewMessage:
            return generateNewNotificationMessage(townName, channelName, senderName)
        case AppNotificationType.Mention:
            return generateMentionedMessage(townName, channelName, senderName)
        case AppNotificationType.ReplyTo:
            return generateReplyToMessage(townName, channelName, senderName)
        default:
            return {
                title: 'Town',
                body: 'New Notification',
            }
    }
}

async function addSpaceToIdb(space: SpaceData) {
    if (!idbSpaces) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }
    const spaceId = space.id.networkId
    const cacheSpace = await idbSpaces.get(spaceId)

    if (!cacheSpace || cacheSpace.name !== space.name) {
        console.log('sw: adding space to idb', spaceId)
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
    const allIdbChannelsForSpace = await idbChannels.getAllFromIndex('bySpace', space.id.networkId)

    const missingItems = channels.filter(
        (channel) =>
            !allIdbChannelsForSpace.some((idbChannel) => idbChannel.id === channel.id.networkId),
    )
    const nameChangedItems = channels.filter((channel) =>
        allIdbChannelsForSpace.some(
            (idbChannel) =>
                idbChannel.id === channel.id.networkId && idbChannel.name !== channel.label,
        ),
    )
    const itemsToUpdate = missingItems.concat(nameChangedItems)

    if (itemsToUpdate.length) {
        const tx = await idbChannels.transaction('readwrite')
        const store = tx.store
        await Promise.all([
            ...itemsToUpdate.map((item) =>
                store.put?.({
                    id: item.id.networkId,
                    name: item.label,
                    parentSpaceId: space.id.networkId,
                }),
            ),
            tx.done,
        ])
    }
}

async function addUsersToIdb(membersMap: { [userId: string]: RoomMember | undefined }) {
    if (!idbUsers) {
        ;({ idbChannels, idbUsers, idbSpaces } = startDBWithTerminationListener())
    }
    const allIdbUsers = await idbUsers.getAll()

    const missingMembers = Object.values(membersMap).filter(
        (member): member is RoomMember =>
            member !== undefined && !allIdbUsers.some((idbUser) => idbUser.id === member.userId),
    )
    if (missingMembers.length) {
        const tx = await idbUsers.transaction('readwrite')
        const store = tx.store
        await Promise.all([
            ...missingMembers.map(async (member) => {
                await store.put?.({
                    name: member.name,
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
