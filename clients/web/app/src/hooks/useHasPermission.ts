import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Permission, useSpaceId, useZionClient } from 'use-zion-client'
import { useAuth } from './useAuth'

export function useHasPermission(permission: Permission, channelId?: string) {
    const { client } = useZionClient()
    const spaceId = useSpaceId()
    const { loggedInWalletAddress: wallet } = useAuth()

    const hasClient = !!client
    const hasSpaceId = !!spaceId
    const { permission: _permission, channelId: _channelId } = useMemo(() => {
        return {
            permission,
            channelId: channelId ?? '',
        }
    }, [permission, channelId])

    return useQuery(
        [spaceId?.networkId, _channelId, wallet, _permission, { hasSpaceId, hasClient }],
        async () => {
            if (hasClient && hasSpaceId && wallet) {
                return (
                    (await client.isEntitled(spaceId.networkId, _channelId, wallet, _permission)) ??
                    null
                )
            }
        },
        {
            enabled: hasClient && hasSpaceId,
        },
    )
}
