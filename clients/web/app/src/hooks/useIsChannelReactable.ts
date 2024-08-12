import { Permission, useHasPermission } from 'use-towns-client'
import { useMemo } from 'react'
import { useIsChannelWritable } from './useIsChannelWritable'

export const useIsChannelReactable = (
    spaceId: string | undefined,
    channelId: string,
    loggedInWalletAddress: string | undefined,
) => {
    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)
    const { hasPermission, isLoading } = useHasPermission({
        spaceId: spaceId,
        channelId: channelId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.React,
    })

    const isChannelReactable = isLoading ? undefined : hasPermission

    return useMemo(() => {
        return {
            isChannelReactable: isChannelWritable || isChannelReactable,
        }
    }, [isChannelWritable, isChannelReactable])
}
