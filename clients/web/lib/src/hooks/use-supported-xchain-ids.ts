import { useTownsContext } from '../components/TownsContextProvider'
import { getDefaultXChainIds } from '../client/XChainConfig'
import { useMemo } from 'react'

export function useSupportedXChainIds() {
    const { baseChain } = useTownsContext()
    return useMemo(() => getDefaultXChainIds(baseChain.id), [baseChain.id])
}
