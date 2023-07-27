import { RoomMember, SpaceData, UserIdToMember } from 'use-zion-client'
import {
    AppNotification,
    AppNotificationType,
    ServiceWorkerMessageType,
    WEB_PUSH_NAVIGATION_CHANNEL,
} from './types.d'
import { appNotificationFromPushEvent } from './notificationParsers'
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
    const navigationChannel = new BroadcastChannel(WEB_PUSH_NAVIGATION_CHANNEL)

    // `activate` fires once old service worker is gone and new one has taken control
    worker.addEventListener('activate', () => {
        startDBWithTerminationListener()
    })

    worker.addEventListener('message', async (event) => {
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

    worker.addEventListener('push', async (event) => {
        if (!event.data) {
            console.log('sw: push event contains no data')
            return
        }
        const jsonString = event.data.text() || '{}'
        console.log('sw: received notification', jsonString)
        const notification = appNotificationFromPushEvent(jsonString)

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
        const data = event.data.text()
        await worker.registration.showNotification(title, {
            body,
            silent: false,
            icon: '/pwa/maskable_icon_x192.png',
            data,
        })

        console.log('sw: Notification shown')
    })

    worker.addEventListener('notificationclick', (event) => {
        console.log('sw: Clicked on a notification', event)
        navigationChannel.postMessage(event.notification.data)
        event.notification.close()
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
            body = `@${sender} posted a new encrypted message in #${channelName}`
            break
        case stringHasValue(channelName) && !stringHasValue(sender):
            body = `You've received a new encrypted message in #${channelName}`
            break
        case !stringHasValue(channelName) && stringHasValue(sender):
            body = `@${sender} posted a new encrypted message`
            break
        default:
            body = `You've received a new encrypted message`
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
