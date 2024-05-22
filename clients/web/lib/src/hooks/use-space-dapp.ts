import { BaseChainConfig, ISpaceDapp } from '@river-build/web3'
import { TProvider } from '../types/web3-types'
import { useSpaceDappStore } from './use-space-dapp-store'

// a hook to create a SpaceDapp instance outside of the client SDK
export const useSpaceDapp = ({
    provider,
    config,
}: {
    provider: TProvider
    config: BaseChainConfig
}): ISpaceDapp => {
    // pass the props to the store to initialize it
    // the store will create a new SpaceDapp instance if it doesn't already exist
    // or return the existing instance if it does
    const spaceDapp = useSpaceDappStore((state) => state.spaceDapp, provider, config)

    return spaceDapp
}
