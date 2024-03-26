import { Address, useMyUserId, useSpaceDapp, useWeb3Context } from 'use-towns-client'
import { useQuery } from '@tanstack/react-query'
import { useAbstractAccountAddress } from './useAbstractAccountAddress'

const queryKey = 'isSmartAccountDeployed'

export function useIsSmartAccountDeployed() {
    const userId = useMyUserId()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address | undefined,
    })
    const { provider, chain } = useWeb3Context()
    const spaceDapp = useSpaceDapp({
        provider,
        chainId: chain?.id,
    })

    return useQuery({
        queryKey: [queryKey, abstractAccountAddress],
        queryFn: async () => {
            if (!abstractAccountAddress || !spaceDapp || !spaceDapp.provider) {
                return false
            }
            const isDeployed = await spaceDapp.provider.getCode(abstractAccountAddress)
            if (!isDeployed || isDeployed === '0x') {
                return false
            }
            return true
        },
        enabled: !!abstractAccountAddress && !!spaceDapp?.provider,
    })
}
