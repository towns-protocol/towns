import { Permission, RoomIdentifier, useHasPermission } from 'use-zion-client'

export const useIsChannelWritable = (
    spaceId: RoomIdentifier | undefined,
    channelId: RoomIdentifier,
    loggedInWalletAddress: string | undefined,
) => {
    const { hasPermission, isLoading } = useHasPermission({
        spaceId: spaceId?.networkId,
        channelId: channelId.networkId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Write,
    })
    const isChannelWritable = isLoading ? undefined : hasPermission

    return { isChannelWritable }
}
