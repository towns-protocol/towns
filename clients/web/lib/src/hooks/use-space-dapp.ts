import { useMemo } from 'react'
import { BaseChainConfig, ISpaceDapp, createSpaceDapp } from '@river-build/web3'
import { TProvider } from '../types/web3-types'

// a hook to create a SpaceDapp instance outside of the client SDK
export const useSpaceDapp = ({
    provider,
    config,
}: {
    provider: TProvider
    config: BaseChainConfig
}) => {
    const spaceDapp = useMemo<ISpaceDapp>(
        () => createSpaceDapp(provider, config),
        [provider, config],
    )
    return spaceDapp
}
