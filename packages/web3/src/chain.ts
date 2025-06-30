import { defineChain } from 'viem'

export const towns = defineChain({
    id: 550,
    name: 'Towns Mainnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: [`https://mainnet.rpc.towns.com/`],
        },
    },
    blockExplorers: {
        default: {
            name: 'Towns Chain Explorer',
            url: 'https://explorer.towns.com/',
        },
    },
    contracts: {
        multicall3: {
            address: '0x4920EF7722b73Fdc9f6391829cfB3844f39393B3',
            blockCreated: 12653370,
        },
    },
})

export const townsTestnet = defineChain({
    id: 6524490,
    name: 'Towns Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: [`https://testnet.rpc.towns.com/http`],
        },
    },
    blockExplorers: {
        default: {
            name: 'Towns Chain Explorer',
            url: 'https://testnet.explorer.towns.com/',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcaBdE26Efcf78d31040Dc57F85484e786E0a1E13',
            blockCreated: 20137781,
        },
    },
})
