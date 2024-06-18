import {
    LookupUser,
    SpaceContextProvider,
    SpaceData,
    useMyUserId,
    useSpaceDataWithId,
    useTownsContext,
    useUserLookupStore,
} from 'use-towns-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import debug from 'debug'
import { CurrentUser, NotificationCurrentUser } from 'store/notificationCurrentUser'
import { notUndefined } from 'ui/utils/utils'
import { NotificationStore } from '../store/notificationStore'
import { User } from './types'
import { preferredUsername } from './utils'

const log = debug('sw:push:')

function createInitialCurrentUser() {
    return new NotificationCurrentUser()
}

export function ServiceWorkerMetadataSyncer() {
    const myUserId = useMyUserId()
    const { casablancaClient, spaceHierarchies } = useTownsContext()
    const [store, setStore] = useState<NotificationStore | null>(null)
    const [currentUser] = useState<NotificationCurrentUser>(createInitialCurrentUser)

    const cryptoStoreDatabaseName = useMemo(() => {
        log(
            'casablancaClient.cryptoStore.name:',
            casablancaClient?.cryptoStore?.name ?? 'undefined',
        )
        if (!casablancaClient) {
            return
        }
        return casablancaClient.cryptoStore.name
    }, [casablancaClient])

    useEffect(() => {
        let cancelled = false
        async function setCurrentUser() {
            if (!myUserId || !cryptoStoreDatabaseName) {
                return
            }

            try {
                const currentRecord = await currentUser.getCurrentUserRecord()
                if (currentRecord?.userId !== myUserId) {
                    const updatedRecord: CurrentUser = {
                        userId: myUserId,
                        databaseName: cryptoStoreDatabaseName,
                        notificationClickedTimestamp: 0,
                    }
                    await currentUser.setCurrentUserRecord(updatedRecord)
                    log('set currentUser', updatedRecord)
                }
                if (!cancelled) {
                    // open the notification cache for this user
                    setStore(new NotificationStore(myUserId))
                }
            } catch (error) {
                console.error('sw:push: error setting my userId', error)
            }
        }
        void setCurrentUser()
        return () => {
            cancelled = true
        }
    }, [cryptoStoreDatabaseName, currentUser, myUserId])

    return (
        <>
            {/* wait for the notification store to be opened before processing metadata for notification */}
            {store ? <UsersMetadata store={store} /> : null}
            {store ? <DmMetadata store={store} /> : null}
            {store
                ? Object.keys(spaceHierarchies).map((spaceId) => (
                      <SpaceContextProvider key={spaceId} spaceId={spaceId}>
                          <SpacesAndChannelsMetadata spaceId={spaceId} store={store} />
                      </SpaceContextProvider>
                  ))
                : null}
        </>
    )
}

// TODO: mimic the previous version, needs refactoring in a separate PR (SW to
// fetch from same store)
function UsersMetadata({ store }: { store: NotificationStore }) {
    const { allUsers } = useUserLookupStore()

    const setUsers = useCallback(
        async (users: LookupUser[]) => {
            const cachedUsers = await store.getUsers()
            const changedNames = users
                .filter(
                    (member) =>
                        member &&
                        !cachedUsers.some(
                            (u) => u.id === member.userId && u.name === preferredUsername(member),
                        ),
                )
                .filter((member) => member !== undefined) as User[]
            if (changedNames.length) {
                const usersToUpdate = changedNames.map((u) => ({
                    id: u.userId,
                    name: preferredUsername(u),
                }))
                await store.users.bulkPut(usersToUpdate)
                log('added users to the notification cache', 'usersToUpdate:', usersToUpdate)
            }
        },
        [store],
    )

    useEffect(() => {
        const users = Object.entries(allUsers)
            .map(([userId, spaces]) => {
                return Object.values(spaces).find((user) => {
                    return user.displayName || user.username
                }) as LookupUser | undefined
            })
            .filter(notUndefined)
        void setUsers(users)
    }, [allUsers, setUsers])

    return null
}

function DmMetadata({ store }: { store: NotificationStore }) {
    const { dmChannels } = useTownsContext()

    const setDmChannels = useCallback(
        async (parentSpaceId?: string) => {
            if (!store) {
                return
            }
            const channelIds = dmChannels.map((c) => c.id)
            const cachedDmChannels = (await store.getDmChannelsByIds(channelIds)).filter(
                (c) => c !== undefined,
            )
            const changedDmChannels = dmChannels.filter(
                (channel) =>
                    // cannot find the channel in the cache
                    cachedDmChannels.filter((c) => c?.id === channel.id).length === 0 ||
                    // the channel is in the cache, but the name is different
                    cachedDmChannels.some(
                        (c) => c?.id === channel.id && c.name !== channel.properties?.name,
                    ),
            )

            if (changedDmChannels.length) {
                const channelsToUpdate = changedDmChannels.map((c) => ({
                    id: c.id,
                    name: c.properties?.name ?? '',
                    parentSpaceId: parentSpaceId ?? '',
                }))
                await store.dmChannels.bulkPut(channelsToUpdate)
                log(
                    'added DM/GDM channels to notification cache',
                    'channelIds',
                    channelIds,
                    'cachedDmChannels',
                    cachedDmChannels,
                    'changedDmChannels:',
                    changedDmChannels,
                )
            }
        },
        [dmChannels, store],
    )

    useEffect(() => {
        void setDmChannels()
    }, [setDmChannels])

    return null
}

function SpacesAndChannelsMetadata({
    spaceId,
    store,
}: {
    spaceId: string
    store: NotificationStore
}) {
    const space = useSpaceDataWithId(spaceId, 'SpacesAndChannelsMetadata')

    const setSpace = useCallback(
        async (space: SpaceData) => {
            const cacheSpace = await store.getSpace(space.id)
            if (!cacheSpace || cacheSpace.name !== space.name) {
                await store.setSpace({
                    id: space.id,
                    name: space.name,
                })
                log(
                    'added space to notification cache',
                    'spaceId:',
                    space.id,
                    'spaceName:',
                    space.name,
                )
            }
        },
        [store],
    )

    const setChannels = useCallback(
        async (space: SpaceData) => {
            const channels = space.channelGroups.flatMap((cg) => cg.channels)
            const cachedChannels = await store.getChannelsBySpaceId(space.id)
            const changedChannels = channels.filter(
                (channel) =>
                    !cachedChannels.some((c) => c.id === channel.id) ||
                    cachedChannels.some(
                        (c) =>
                            c.id === channel.id &&
                            c.name !== channel.label &&
                            channel.label !== c.id, // ignore the channel id as label (could happen if cache is cleared)
                    ),
            )

            if (changedChannels.length) {
                const channelsToUpdate = changedChannels.map((c) => ({
                    id: c.id,
                    name: c.label,
                    parentSpaceId: space.id,
                }))
                await store.channels.bulkPut(channelsToUpdate)
                log(
                    'added channels to notification cache',
                    'spaceId:',
                    space.id,
                    'channels:',
                    channels,
                )
            }
        },
        [store],
    )

    useEffect(() => {
        if (space) {
            void setSpace(space)
            void setChannels(space)
        }
    }, [setChannels, setSpace, space])

    return null
}
