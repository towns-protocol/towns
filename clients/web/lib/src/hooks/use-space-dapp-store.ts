import { createStore, StoreApi } from 'zustand'
import { BaseChainConfig, SpaceDapp } from '@towns-protocol/web3'
import { TProvider } from '../types/web3-types'

// Define the store
interface SpaceDappStore {
    spaceDapp: SpaceDapp | undefined
    provider: TProvider | undefined
    config: BaseChainConfig | undefined
    setSpaceDapp: (spaceDapp: SpaceDapp, provider: TProvider, config: BaseChainConfig) => void
}

// This function will create the store and initialize the spaceDapp if it doesn't already exist
const createSpaceDappStore = (): StoreApi<SpaceDappStore> => {
    return createStore<SpaceDappStore>((set) => ({
        spaceDapp: undefined,
        provider: undefined,
        config: undefined,
        setSpaceDapp: (spaceDapp, provider, config) => set({ spaceDapp, provider, config }),
    }))
}

const store = createSpaceDappStore()

export const useSpaceDappStore = (
    selector: (state: SpaceDappStore) => SpaceDapp | undefined,
    provider: TProvider,
    config: BaseChainConfig,
): SpaceDapp => {
    const {
        spaceDapp,
        setSpaceDapp,
        provider: currentProvider,
        config: currentConfig,
    } = store.getState()

    if (!spaceDapp || currentProvider !== provider || currentConfig !== config) {
        const newSpaceDapp = new SpaceDapp(config, provider)
        setSpaceDapp(newSpaceDapp, provider, config)
    }

    const cachedDapp = selector(store.getState())

    if (!cachedDapp) {
        throw new Error('useSpaceDappStore: spaceDapp is undefined')
    }

    return cachedDapp
}
