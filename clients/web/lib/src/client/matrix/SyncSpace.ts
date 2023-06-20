import { MatrixClient, Room as MatrixRoom } from 'matrix-js-sdk'

import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import { ISpaceDapp } from '../web3/ISpaceDapp'
import { MatrixRoomIdentifier } from '../../types/room-identifier'
import { Permission } from '../web3/ContractTypes'
import { QueryKeys } from '../../hooks/query-keys'
import { RoomHierarchy } from 'matrix-js-sdk/lib/room-hierarchy'
import { queryClient } from '../../query/queryClient'

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
        [QueryKeys.SyncEntitledChannels, spaceId.networkId],
        () => getEntitledChannels(children, root, walletAddress, spaceDapp),
        {
            // We don't need to check channel entitlements often
            // when someone joins/creates a channel, this query is removed and the entitlements for the space are refetched
            staleTime: 1000 * 60 * 20,
            cacheTime: 1000 * 60 * 25,
        },
    )

    // https://linear.app/hnt-labs/issue/HNT-1594/app-hanging-and-not-loading-on-desktop
    // is entitled call filtering out channels?
    console.log('[syncMatrixSpace] children', {
        spaceId,
        matrixChildren: children,
        filteredChildren: onChainChannels,
    })

    if (!root) {
        console.error('syncing space error', networkId, 'no root', roomHierarchy)
        return undefined
    }
    return { root: root, children: onChainChannels }
}

async function getEntitledChannels(
    children: IHierarchyRoom[],
    root: IHierarchyRoom | undefined,
    walletAddress: string,
    spaceDapp: ISpaceDapp,
) {
    return (
        await Promise.all(
            children.map(async (c) => {
                if (!root) {
                    return undefined
                }

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
                    console.error(
                        '[syncMatrixSpace] failed to check entitlement for channel: ',
                        c.name,
                        c.room_id,
                        JSON.stringify(e),
                    )
                }
                // not entitled to channel
                return undefined
            }),
        )
    ).filter((c): c is IHierarchyRoom => !!c)
}
