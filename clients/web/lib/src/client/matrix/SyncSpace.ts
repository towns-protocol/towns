import { MatrixClient, Room as MatrixRoom } from 'matrix-js-sdk'

import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import { MatrixRoomIdentifier } from '../../types/room-identifier'
import { ISpaceDapp, Permission } from '@river/web3'
import { blockchainKeys } from '../../query/query-keys'
import { RoomHierarchy } from 'matrix-js-sdk/lib/room-hierarchy'
import { queryClient } from '../../query/queryClient'
import { Membership } from '../../types/zion-types'

export type MatrixSpaceHierarchy = {
    root: IHierarchyRoom
    children: IHierarchyRoom[]
}

export async function syncMatrixSpace(
    matrixClient: MatrixClient,
    spaceDapp: ISpaceDapp,
    spaceId: MatrixRoomIdentifier,
    walletAddress: string,
): Promise<MatrixSpaceHierarchy | undefined> {
    const userId = matrixClient.getUserId()
    if (!userId) {
        throw new Error('syncing space error: no userId')
    }

    const networkId = spaceId.networkId
    const matrixRoom =
        matrixClient.getRoom(networkId) || new MatrixRoom(networkId, matrixClient, userId)
    const roomHierarchy = new RoomHierarchy(matrixRoom)

    console.log(
        '[syncMatrixSpace]',
        'roomId:',
        spaceId.networkId,
        'roomName:',
        `"${matrixRoom.name}"`,
        'walletAddress:',
        walletAddress,
    )

    try {
        while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
            await roomHierarchy.load()
        }
    } catch (reason) {
        console.error('syncing space error', networkId, reason)
    }
    const root = roomHierarchy.rooms
        ? roomHierarchy.rooms.find((r) => r.room_id === networkId)
        : undefined
    const children = roomHierarchy.rooms
        ? roomHierarchy.rooms.filter((r) => r.room_id !== networkId)
        : []

    const onChainChannels = await queryClient.fetchQuery(
        blockchainKeys.entitledChannels(spaceId.networkId),
        () => filterEntitledChannels(children, root, walletAddress, spaceDapp, matrixClient),
        {
            // evan 7.3.23: we don't really need to cache this, as SyncSpace is called so infrequently that we can just fetch these channels every time
            // But maybe we do want to cache this in the future, so I'm leaving this here for now since it doesn't hurt
            // If we don't cache this, we can also remove the removeSyncedEntitleChannelsQueries() calls
            // Note that this is calling queryClient.fetchQuery, and not in react via useQuery, so we don't need to worry about other config options i.e. refetchOnMount, etc.
            staleTime: 1000 * 15,
        },
    )

    console.log('[syncMatrixSpace] children', {
        spaceId,
        matrixChildren: children,
        onChainChannels,
    })

    if (!root) {
        console.error('syncing space error', networkId, 'no root', roomHierarchy)
        return undefined
    }
    return { root: root, children: onChainChannels }
}

async function filterEntitledChannels(
    children: IHierarchyRoom[],
    root: IHierarchyRoom | undefined,
    walletAddress: string,
    spaceDapp: ISpaceDapp,
    matrixClient: MatrixClient,
) {
    return (
        await Promise.all(
            children.map(async (c) => {
                if (!root) {
                    return undefined
                }
                // evan 7.3.23: should we filter for channels where membership == join?  it's currently done in the app
                try {
                    const isEntitledToChannel = await spaceDapp.isEntitledToChannel(
                        root.room_id,
                        c.room_id,
                        walletAddress,
                        Permission.Read,
                    )
                    if (isEntitledToChannel) {
                        return c
                    }
                } catch (e) {
                    const error = await spaceDapp.parseSpaceError(root.room_id, e)
                    if (isChannelDoesNotExistError(error)) {
                        await leaveChannelIfMember(matrixClient, c.room_id, error)
                        return false
                    } else {
                        console.error(
                            '[syncMatrixSpace] error checking entitlement for channel: ',
                            {
                                channel: c,
                                space: root,
                                error,
                            },
                            error,
                        )
                    }
                }
                // not entitled to channel
                return undefined
            }),
        )
    ).filter((c): c is IHierarchyRoom => !!c)
}

// a channel may have been created on the server, but not on the blockchain
async function leaveChannelIfMember(matrixClient: MatrixClient, channelId: string, error: Error) {
    const channelRoom = matrixClient.getRoom(channelId)

    if (channelRoom && channelRoom.getMyMembership() === Membership.Join) {
        const roomCreateEvent = channelRoom
            ?.getLiveTimeline()
            .getEvents()
            .filter((e) => e.getType() === 'm.room.create')[0]

        const createdTs = roomCreateEvent?.getTs()
        if (createdTs) {
            const current = Date.now()
            const twoHoursAfterCreated = createdTs + 2 * 60 * 60 * 1000

            // need a delay because the sync might run before i continue with transaction (via wallet), and i don't want to leave a channel i am currently creating
            // if 2 hours have passed, its safe to assume that i gave up on creating the channel
            // if i somehow resume the wallet transaction after this time, i will have to rejoin the channel
            if (current > twoHoursAfterCreated) {
                try {
                    console.warn(
                        '[syncMatrixSpace] member of matrix channel that does not exist in blockchain, leaving channel: ',
                        {
                            channelRoom,
                            error,
                        },
                    )
                    await matrixClient.leave(channelRoom.roomId)
                } catch (error) {
                    console.log(
                        '[syncMatrixSpace] error leaving matrix channel that does not exist in blockchain: ',
                        {
                            channelRoom,
                            error,
                        },
                    )
                }
            }
        }
    }
}

function isChannelDoesNotExistError(
    parsedError: Awaited<ReturnType<ISpaceDapp['parseSpaceError']>>,
) {
    return (
        (
            parsedError as Error & {
                message: {
                    errorName: string
                }
            }
        )?.message?.errorName === 'ChannelDoesNotExist'
    )
}
