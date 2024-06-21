import {
    Client as CasablancaClient,
    isSpaceStreamId,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river-build/sdk'
import { useEffect, useState } from 'react'
import { Membership, Room, toMembership } from '../../types/towns-types'
import isEqual from 'lodash/isEqual'
import { TownsOpts } from '../../client/TownsClientTypes'
import {
    OfflineChannelMetadata,
    OfflineStates,
    useOfflineStore,
} from '../../store/use-offline-store'

export function useCasablancaRooms(
    opts: TownsOpts,
    client?: CasablancaClient,
): Record<string, Room | undefined> {
    const [rooms, setRooms] = useState<Record<string, Room | undefined>>(() => {
        const allChannelsAndSpaces = client?.streams
            .getStreamIds()
            .filter((stream) => {
                return (
                    isSpaceStreamId(stream) ||
                    isChannelStreamId(stream) ||
                    isDMChannelStreamId(stream) ||
                    isGDMChannelStreamId(stream)
                )
            })
            .reduce((acc: Record<string, Room | undefined>, stream: string) => {
                acc[stream] = toCasablancaRoom(
                    stream,
                    client,
                    useOfflineStore.getState().offlineChannelMetadataMap,
                )
                return acc
            }, {})
        return allChannelsAndSpaces ?? {}
    })

    //TODO: placeholder for working with Rooms in Casablanca
    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        const updateState = (streamId: string) => {
            const newRoom = toCasablancaRoom(
                streamId,
                client,
                useOfflineStore.getState().offlineChannelMetadataMap,
            )
            setRooms((prev) => {
                const prevRoom = prev[streamId]
                const prevMember = prevRoom?.membership === Membership.Join
                const newMember = newRoom?.membership === Membership.Join
                // in the case of a user leaving a room, they should still get the latest update
                // if they were not a member before and still aren't, then don't update
                if (!prevMember && !newMember) {
                    return prev
                }
                return isEqual(prevRoom, newRoom) ? prev : { ...prev, [streamId]: newRoom }
            })
        }

        // subscribe to changes
        const onStreamUpdated = (streamId: string) => {
            if (
                isSpaceStreamId(streamId) ||
                isChannelStreamId(streamId) ||
                isDMChannelStreamId(streamId) ||
                isGDMChannelStreamId(streamId)
            ) {
                updateState(streamId)
            }
        }

        const onChannelUpdated = (_spaceId: string, channelId: string) => {
            updateState(channelId)
        }

        const onOfflineStoreChange = (store: OfflineStates, prev: OfflineStates) => {
            if (!isEqual(store.offlineChannelMetadataMap, prev.offlineChannelMetadataMap)) {
                const channelIds = Object.keys(store.offlineChannelMetadataMap)
                channelIds.forEach((channelId) => {
                    if (
                        !isEqual(
                            store.offlineChannelMetadataMap[channelId],
                            prev.offlineChannelMetadataMap[channelId],
                        )
                    ) {
                        updateState(channelId)
                    }
                })
            }
        }

        const unsubMetadata = useOfflineStore.subscribe(onOfflineStoreChange)

        client.on('streamNewUserJoined', onStreamUpdated)
        client.on('streamUserLeft', onStreamUpdated)
        client.on('userStreamMembershipChanged', onStreamUpdated)
        client.on('streamInitialized', onStreamUpdated)
        client.on('streamDisplayNameUpdated', onStreamUpdated)
        client.on('streamPendingDisplayNameUpdated', onStreamUpdated)
        client.on('streamUsernameUpdated', onStreamUpdated)
        client.on('streamPendingUsernameUpdated', onStreamUpdated)
        client.on('spaceChannelUpdated', onChannelUpdated)
        client.on('streamEnsAddressUpdated', onStreamUpdated)
        client.on('streamNftUpdated', onStreamUpdated)

        return () => {
            unsubMetadata()
            client.off('streamNewUserJoined', onStreamUpdated)
            client.off('streamUserLeft', onStreamUpdated)
            client.off('userStreamMembershipChanged', onStreamUpdated)
            client.off('streamInitialized', onStreamUpdated)
            client.off('streamDisplayNameUpdated', onStreamUpdated)
            client.off('streamPendingDisplayNameUpdated', onStreamUpdated)
            client.off('streamUsernameUpdated', onStreamUpdated)
            client.off('streamPendingUsernameUpdated', onStreamUpdated)
            client.off('spaceChannelUpdated', onChannelUpdated)
            client.off('streamEnsAddressUpdated', onStreamUpdated)
            client.off('streamNftUpdated', onStreamUpdated)
            setRooms({})
        }
    }, [client])
    return rooms
}

/**
 * Get room entity filled with data for specific stream. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns Room entity filled with data for specific stream. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
function toCasablancaRoom(
    streamId: string,
    client: CasablancaClient,
    offlineChannelInfoMap: Record<string, OfflineChannelMetadata>,
): Room | undefined {
    //reject if client is not defined
    if (!client) {
        throw new Error('Client not defined')
    }

    const userStreamId = client.userStreamId
    if (!userStreamId) {
        throw new Error('User not logged in')
    }
    const userStream = client.streams.get(userStreamId)
    if (!userStream) {
        throw new Error('User not logged in')
    }

    //reject if streamId is not associated with a channel, space or DM
    if (
        !isSpaceStreamId(streamId) &&
        !isChannelStreamId(streamId) &&
        !isDMChannelStreamId(streamId) &&
        !isGDMChannelStreamId(streamId)
    ) {
        throw new Error('Invalid streamId: ' + streamId)
    }

    const stream = client.streams.get(streamId)
    if (!stream) {
        return undefined
    }

    let isDefault: boolean = false
    if (isChannelStreamId(streamId)) {
        const parentSpace = client.streams.get(streamId)?.view.channelContent.spaceId
        if (parentSpace === undefined) {
            throw new Error('Parent space not found for streamId: ' + streamId)
        }
        const channelMetadata = client.streams
            .get(parentSpace)
            ?.view.spaceContent.spaceChannelsMetadata.get(streamId)
        isDefault = channelMetadata?.isDefault ?? false
    }

    const name = offlineChannelInfoMap[streamId]?.channel.name ?? streamId
    const description = offlineChannelInfoMap[streamId]?.channel.description

    return {
        id: streamId,
        name,
        membership: toMembership(userStream.view.userContent.getMembership(streamId)?.op),
        members: Array.from(stream.view.getMembers().membership.joinedUsers),
        inviter: undefined,
        isSpaceRoom: isSpaceStreamId(streamId),
        topic: description,
        isDefault: isDefault,
    }
}
