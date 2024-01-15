import {
    GlobalContextUserLookupProvider,
    SpaceContextProvider,
    SpaceData,
    useMyProfile,
    useSpaceData,
    useUserLookupContext,
    useZionContext,
} from 'use-zion-client'

import React, { useCallback, useEffect, useState } from 'react'
import debug from 'debug'
import { NotificationCurrentUser } from 'store/notificationCurrentUser'
import { NotificationStore } from '../store/notificationStore'
import { User } from './types.d'
import { preferredUsername } from './utils'

const log = debug('sw:push')

function createInitialCurrentUser() {
    return new NotificationCurrentUser()
}

export function ServiceWorkerMetadataSyncer() {
    const myProfile = useMyProfile()
    const { spaceHierarchies } = useZionContext()
    const [store, setStore] = useState<NotificationStore | null>(null)
    const [currentUser] = useState<NotificationCurrentUser>(createInitialCurrentUser)

    useEffect(() => {
        let cancelled = false
        async function setCurrentUserId() {
            if (!myProfile?.userId) {
                return
            }

            const currentUserId = myProfile.userId
            try {
                if (currentUserId) {
                    await currentUser.setCurrentUserId(currentUserId)
                    if (!cancelled) {
                        // open the notification cache for this user
                        setStore(new NotificationStore(currentUserId))
                        log('set current user', 'currentUserId:', currentUserId)
                    }
                }
            } catch (error) {
                console.error('sw:push: error setting my userId', error)
            }
        }
        void setCurrentUserId()
        return () => {
            cancelled = true
        }
    }, [currentUser, myProfile?.userId])

    return (
        <GlobalContextUserLookupProvider>
            {/* wait for the notification store to be opened before processing metadata for notification */}
            {store ? <UsersMetadata store={store} /> : null}
            {store
                ? Object.values(spaceHierarchies).map(({ root }) => (
                      <SpaceContextProvider key={root.id} spaceId={root.id}>
                          <SpacesAndChannelsMetadata spaceId={root.id} store={store} />
                      </SpaceContextProvider>
                  ))
                : null}
        </GlobalContextUserLookupProvider>
    )
}

function UsersMetadata({ store }: { store: NotificationStore }) {
    const members = useUserLookupContext()

    const setUsers = useCallback(
        async (membersMap: { [userId: string]: User | undefined }) => {
            const cachedUsers = await store.getUsers()
            const changedNames = Object.values(membersMap)
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
                log('added users to the notification cache', 'memberMap:', membersMap)
            }
        },
        [store],
    )

    useEffect(() => {
        if (members.usersMap) {
            void setUsers(members.usersMap)
        }
    }, [members.usersMap, setUsers])

    return null
}

function SpacesAndChannelsMetadata({
    spaceId,
    store,
}: {
    spaceId: string
    store: NotificationStore
}) {
    const space = useSpaceData(spaceId)

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
            const cachedChannels = await store.getChannels(space.id)
            const changedChannels = channels.filter(
                (channel) =>
                    !cachedChannels.some((c) => c.id === channel.id && c.name !== channel.label),
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
