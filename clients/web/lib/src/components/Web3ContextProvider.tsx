import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { Chain } from 'viem/chains'
import { TProvider, IChainConfig } from '../types/web3-types'
import { ethers } from 'ethers'
import isEqual from 'lodash/isEqual'

export interface IWeb3Context {
    provider?: TProvider
    chain: Chain
    riverChain: IChainConfig
    riverChainProvider: TProvider
}

export const Web3Context = createContext<IWeb3Context | undefined>(undefined)

export function useWeb3Context(): IWeb3Context {
    const context = useContext(Web3Context)
    if (!context) {
        throw new Error('useWeb3Context must be used in a Web3ContextProvider')
    }
    return context
}

interface Props {
    children: JSX.Element
    chain: Chain
    riverChain: IChainConfig
}

export function Web3ContextProvider(props: Props): JSX.Element {
    const { chain, riverChain } = props

    if (!chain) {
        console.error('Unsupported chain for Towns', props.chain.id)
    }

    if (!riverChain) {
        console.error('Unsupported chain for River', props.riverChain.chainId)
    }

    const web3 = useWeb3({
        chain,
        riverChain,
    })
    return <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
}

type Web3ContextOptions = {
    chain: Chain
    riverChain: IChainConfig
}

/// web3 components, pass chain to lock to a specific chain, pass signer to override the default signer (usefull for tests)
function useWeb3({ chain, riverChain }: Web3ContextOptions): IWeb3Context {
    const chainRef = useRef<Chain>(chain)
    const providerRef = useRef<TProvider>(makeProviderFromChain(chain))
    const riverChainRef = useRef<IChainConfig>(riverChain)
    const riverChainProviderRef = useRef<TProvider>(makeProviderFromConfig(riverChain))

    // the chain should never change because we lock to a specific chain,
    // but just in case
    if (!isEqual(chainRef.current, chain)) {
        chainRef.current = chain
        providerRef.current = makeProviderFromChain(chain)
    }

    if (!isEqual(riverChainRef.current, riverChain)) {
        chainRef.current = chain
        riverChainProviderRef.current = makeProviderFromConfig(riverChain)
    }

    useEffect(() => {
        console.log('use web3 ##', {
            chain,
            rpc: chain?.rpcUrls,
            def: chain?.rpcUrls?.default,
            riverChain,
            riverChainRpc: riverChain?.rpcUrl,
            provider: providerRef.current,
            riverChainProvider: riverChainProviderRef.current,
        })
    }, [chain, riverChain])

    return useMemo(
        () => ({
            provider: providerRef.current,
            riverChainProvider: riverChainProviderRef.current,
            chain,
            riverChain,
        }),
        [chain, riverChain],
    )
}

function makeProviderFromChain(chain: Chain): TProvider {
    const rpcUrl = chain.rpcUrls.default.http[0]
    return new ethers.providers.StaticJsonRpcProvider(rpcUrl, {
        chainId: chain.id,
        name: chain.name,
    })
}

function makeProviderFromConfig(chain: IChainConfig): TProvider {
    return new ethers.providers.StaticJsonRpcProvider(chain.rpcUrl, {
        chainId: chain.chainId,
        name: chain?.name ?? '',
    })
}
