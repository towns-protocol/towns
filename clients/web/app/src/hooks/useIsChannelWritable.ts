import { Permission, RoomIdentifier } from 'use-zion-client'
import { useHasPermission } from './useHasPermission'

export const useIsChannelWritable = (channelId: RoomIdentifier) => {
    const { data: hasPermission, isFetched: isWritePermissionFetched } = useHasPermission(
        Permission.Write,
        channelId.networkId,
    )
    const isChannelWritable = !isWritePermissionFetched ? undefined : hasPermission

    return { isChannelWritable }
}
