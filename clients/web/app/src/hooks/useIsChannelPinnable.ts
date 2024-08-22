import { Permission, useHasPermission } from 'use-towns-client'
import { useMemo } from 'react'

export const useIsChannelPinnable = (
    spaceId: string | undefined,
    channelId: string,
    loggedInWalletAddress: string | undefined,
) => {
    const { hasPermission, isLoading } = useHasPermission({
        spaceId: spaceId,
        channelId: channelId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.PinMessage,
    })

    const isChannelPinnable = isLoading ? undefined : hasPermission

    return useMemo(() => {
        return {
            isChannelPinnable,
        }
    }, [isChannelPinnable])
}
