import { useMemo } from 'react'

import { ISpaceDapp, createSpaceDapp } from '@river-build/web3'
import { TProvider } from 'types/web3-types'

// a hook to create a SpaceDapp instance outside of the client SDK
export const useSpaceDapp = ({
    chainId,
    provider,
}: {
    provider: TProvider
    chainId: number | undefined
}) => {
    const spaceDapp = useMemo<ISpaceDapp | undefined>(
        () => (chainId && provider && createSpaceDapp({ chainId, provider })) || undefined,
        [chainId, provider],
    )
    return spaceDapp
}
