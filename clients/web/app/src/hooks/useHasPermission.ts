import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Permission, useSpaceId, useWeb3Context, useZionClient } from 'use-zion-client'

export function useHasPermission(permission: Permission, channelId?: string) {
    const { client } = useZionClient()
    const spaceId = useSpaceId()
    const { accounts } = useWeb3Context()
    const wallet = accounts[0]

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
            if (hasClient && hasSpaceId) {
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
