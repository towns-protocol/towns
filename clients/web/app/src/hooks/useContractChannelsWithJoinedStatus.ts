import { useMemo } from 'react'
import { Membership, useSpaceData, useZionClient } from 'use-zion-client'
import { useContractChannels } from './useContractChannels'
import { useSpaceChannels } from './useSpaceChannels'

export const useContractChannelsWithJoinedStatus = () => {
    const space = useSpaceData()
    const { client } = useZionClient()
    // matrix doesn't always sync left rooms. For example if you leave a room, and all other members leave it too. And there may be other unexpected cases.
    // matrix sdk .syncLeftRooms() returns empty array
    // so using blockchain data to get all the channels
    const { data: contractChannels } = useContractChannels(space?.id)
    const matrixSyncedChannels = useSpaceChannels()

    const contractChannelsWithJoinedStatus = useMemo(() => {
        if (!contractChannels || space?.isLoadingChannels) {
            return []
        }
        return contractChannels.map((c) => {
            const syncedEq = matrixSyncedChannels?.find((m) => m.id === c.channelNetworkId)
            if (!syncedEq) {
                return {
                    ...c,
                    isJoined: false,
                }
            }
            const roomData = client?.getRoomData(syncedEq.id)
            return {
                ...c,
                isJoined: roomData ? roomData.membership === Membership.Join : false,
            }
        })
    }, [client, contractChannels, matrixSyncedChannels, space?.isLoadingChannels])
    return { contractChannelsWithJoinedStatus }
}
