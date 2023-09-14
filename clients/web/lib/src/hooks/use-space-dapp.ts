import { useMemo } from 'react'

import { IWeb3Context } from '../components/Web3ContextProvider'
import { ISpaceDapp, createSpaceDapp } from '@river/web3'

// a hook to create a SpaceDapp instance outside of matrix client context
export const useSpaceDapp = ({
    chainId,
    provider,
}: Pick<IWeb3Context, 'provider'> & {
    chainId: number | undefined
}) => {
    const spaceDapp = useMemo<ISpaceDapp | undefined>(
        () => (chainId && provider && createSpaceDapp(chainId, provider)) || undefined,
        [chainId, provider],
    )
    return spaceDapp
}
