import { useMemo } from 'react'

import { ISpaceDapp } from '../client/web3/ISpaceDapp'
import { IWeb3Context } from '../components/Web3ContextProvider'
import { createSpaceDapp } from '../client/web3/SpaceDappFactory'
import { useZionContext } from '../components/ZionContextProvider'

// a hook to create a SpaceDapp instance outside of matrix client context
export const useSpaceDapp = ({
    chainId,
    provider,
}: Pick<IWeb3Context, 'provider'> & {
    chainId: number | undefined
}) => {
    const { smartContractVersion } = useZionContext()
    const spaceDapp = useMemo<ISpaceDapp | undefined>(
        () =>
            (chainId && provider && createSpaceDapp(chainId, provider, smartContractVersion)) ||
            undefined,
        [chainId, provider, smartContractVersion],
    )
    return spaceDapp
}
