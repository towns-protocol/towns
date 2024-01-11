import {
    GlobalContextUserLookupProvider,
    SpaceContextProvider,
    SpaceData,
    useMyProfile,
    useSpaceData,
    useUserLookupContext,
    useZionContext,
} from 'use-zion-client'
import React, { useEffect } from 'react'

import { NotificationStore } from '../store/notificationStore'
import { ServiceWorkerMessageType, User } from './types.d'
import { UserRecord } from '../store/notificationSchema'
import { preferredUsername } from './utils'

// cache the crypto store and decryptor for each user
const store = new NotificationStore()

export function ServiceWorkerMetadataSyncer() {
    const { spaceHierarchies } = useZionContext()
    return (
        <GlobalContextUserLookupProvider>
            {Object.values(spaceHierarchies).map(({ root }) => (
                <SpaceContextProvider key={root.id} spaceId={root.id}>
                    <NotificationMetadata spaceId={root.id} />
                </SpaceContextProvider>
            ))}
        </GlobalContextUserLookupProvider>
    )
}

function NotificationMetadata({ spaceId }: { spaceId: string }) {
    const space = useSpaceData(spaceId)
    const members = useUserLookupContext()
    const myProfile = useMyProfile()

    const setUser = async (user: UserRecord) => {
        await store.setUser(user)
    }

    const setUsers = async (membersMap: { [userId: string]: User | undefined }) => {
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
            console.log('sw:push: adding users to notification cache', membersMap)
            const usersToUpdate = changedNames.map((u) => ({
                id: u.userId,
                name: preferredUsername(u),
            }))
            await store.users.bulkPut(usersToUpdate)
        }
    }

    const setSpace = async (space: SpaceData) => {
        const cacheSpace = await store.getSpace(space.id)
        if (!cacheSpace || cacheSpace.name !== space.name) {
            console.log('sw:push: adding space to notification cache', space.id, space.name)
            await store.setSpace({
                id: space.id,
                name: space.name,
            })
        }
    }

    const setChannels = async (space: SpaceData) => {
        const channels = space.channelGroups.flatMap((cg) => cg.channels)
        const cachedChannels = await store.getChannels(space.id)
        const changedChannels = channels.filter(
            (channel) =>
                !cachedChannels.some((c) => c.id === channel.id && c.name !== channel.label),
        )

        if (changedChannels.length) {
            console.log('sw:push: adding channels to notification cache', space.id, channels)
            const channelsToUpdate = changedChannels.map((c) => ({
                id: c.id,
                name: c.label,
                parentSpaceId: space.id,
            }))
            await store.channels.bulkPut(channelsToUpdate)
        }
    }

    useEffect(() => {
        if (myProfile) {
            const id = ServiceWorkerMessageType.MyUserId
            const myUserId = myProfile.userId
            console.log('sw:push: adding my name to notification cache', id, myUserId)
            setUser({
                id,
                name: myUserId,
            })
        }
    }, [myProfile])

    useEffect(() => {
        if (space) {
            setSpace(space)
            setChannels(space)
        }
    }, [space])

    useEffect(() => {
        if (members.usersMap) {
            setUsers(members.usersMap)
        }
    }, [members.usersMap])

    return null
}
