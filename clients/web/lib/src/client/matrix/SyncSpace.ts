import { ISpaceDapp } from '../web3/ISpaceDapp'
import { MatrixClient, Room as MatrixRoom } from 'matrix-js-sdk'
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import { RoomHierarchy } from 'matrix-js-sdk/lib/room-hierarchy'
import { MatrixRoomIdentifier } from '../../types/room-identifier'
import { Permission } from '../web3/ContractTypes'
import { getAccount } from '@wagmi/core'
import { QueryKeyChannels } from '../../hooks/query-keys'
import { queryClient } from '../../query/queryClient'

export type MatrixSpaceHierarchy = {
    root: IHierarchyRoom
    children: IHierarchyRoom[]
}

export async function syncMatrixSpace(
    matrixClient: MatrixClient,
    spaceDapp: ISpaceDapp,
    spaceId: MatrixRoomIdentifier,
    walletAddress?: string,
): Promise<MatrixSpaceHierarchy | undefined> {
    const userId = matrixClient.getUserId()
    if (!userId) {
        throw new Error('syncing space error: no userId')
    }
    const networkId = spaceId.networkId
    const matrixRoom =
        matrixClient.getRoom(networkId) || new MatrixRoom(networkId, matrixClient, userId)
    const roomHierarchy = new RoomHierarchy(matrixRoom)

    const address = walletAddress || getAccount()?.address

    try {
        while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
            console.log('syncing space', networkId)
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
        [QueryKeyChannels.SyncEntitledChannels, spaceId.networkId],
        () => getEntitledChannels(children, root, address, spaceDapp),
        {
            // We don't need to check channel entitlements often
            // when someone joins/creates a channel, this query is removed and the entitlements for the space are refetched
            staleTime: 1000 * 60 * 20,
            cacheTime: 1000 * 60 * 25,
        },
    )

    if (!root) {
        console.error('syncing space error', networkId, 'no root', roomHierarchy)
        return undefined
    }
    return { root: root, children: onChainChannels }
}

async function getEntitledChannels(
    children: IHierarchyRoom[],
    root: IHierarchyRoom | undefined,
    address: string | undefined,
    spaceDapp: ISpaceDapp,
) {
    return (
        await Promise.all(
            children.map(async (c) => {
                if (!root || !address) {
                    return
                }

                try {
                    if (
                        !(await spaceDapp.isEntitledToChannel(
                            root.room_id,
                            c.room_id,
                            address,
                            Permission.Read,
                        ))
                    ) {
                        return
                    }
                } catch (e) {
                    console.error(
                        '[syncMatrixSpace] failed to check entitlement for channel: ',
                        c.name,
                        c.room_id,
                        JSON.stringify(e),
                    )
                    return
                }

                return c
            }),
        )
    ).filter((c): c is IHierarchyRoom => !!c)
}
