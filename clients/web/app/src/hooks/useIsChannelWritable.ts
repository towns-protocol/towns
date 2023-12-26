import { Permission, useHasPermission } from 'use-zion-client'

export const useIsChannelWritable = (
    spaceId: string | undefined,
    channelId: string,
    loggedInWalletAddress: string | undefined,
) => {
    const { hasPermission, isLoading } = useHasPermission({
        spaceId: spaceId,
        channelId: channelId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Write,
    })
    const isChannelWritable = isLoading ? undefined : hasPermission

    return { isChannelWritable }
}
