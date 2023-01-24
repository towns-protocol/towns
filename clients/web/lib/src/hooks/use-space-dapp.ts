import { useMemo } from 'react'

import { ISpaceDapp } from '../client/web3/ISpaceDapp'
import { IWeb3Context } from '../components/Web3ContextProvider'
import { SpaceDapp } from '../client/web3/SpaceDapp'

export const useSpaceDapp = ({
    chainId,
    provider,
}: Pick<IWeb3Context, 'provider'> & {
    chainId: number | undefined
}) => {
    const spaceDapp = useMemo<ISpaceDapp | undefined>(
        () =>
            (chainId && provider && new SpaceDapp(chainId, provider, provider?.getSigner?.())) ||
            undefined,
        [chainId, provider],
    )
    return spaceDapp
}
