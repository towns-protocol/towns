import { useSpaceDapp, useTownsContext } from 'use-towns-client'
import { useQuery } from '@tanstack/react-query'
import { useMyAbstractAccountAddress } from './useAbstractAccountAddress'

const queryKey = 'isSmartAccountDeployed'

export function useIsSmartAccountDeployed() {
    const { data: abstractAccountAddress } = useMyAbstractAccountAddress()
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        provider,
        config,
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
