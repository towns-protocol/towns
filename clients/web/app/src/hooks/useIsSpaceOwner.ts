import { useQuery } from '@tanstack/react-query'
import { useSpaceId, useWeb3Context, useZionClient } from 'use-zion-client'

export function useIsSpaceOwner() {
    const { client } = useZionClient()
    const spaceId = useSpaceId()
    const { accounts } = useWeb3Context()
    const wallet = accounts[0]

    const hasClient = !!client
    const hasSpaceId = !!spaceId

    return useQuery(
        ['spaceOwner', hasSpaceId, hasClient],
        async () => {
            if (hasClient && hasSpaceId) {
                return (await client.getSpaceInfoBySpaceId(spaceId.networkId)) || null
            }
        },
        {
            enabled: hasClient && hasSpaceId,
            select: (data) => wallet === data?.owner,
        },
    )
}
