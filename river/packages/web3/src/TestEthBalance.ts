import { createTestClient, http, publicActions, walletActions, defineChain } from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { Address } from './ContractTypes'

export const foundryRiver = /*#__PURE__*/ defineChain({
    id: 31_338,
    name: 'Foundry',
    network: 'foundry',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['http://127.0.0.1:8546'],
            webSocket: ['ws://127.0.0.1:8546'],
        },
        public: {
            http: ['http://127.0.0.1:8546'],
            webSocket: ['ws://127.0.0.1:8546'],
        },
    },
})

async function setBaseBalance(walletAddress: Address, balance: bigint): Promise<void> {
    const privateKey = generatePrivateKey()
    const throwawayAccount = privateKeyToAccount(privateKey)
    const client = createTestClient({
        chain: foundry,
        mode: 'anvil',
        transport: http(),
        account: throwawayAccount,
    })
        .extend(publicActions)
        .extend(walletActions)

    await client.setBalance({
        address: walletAddress,
        value: balance,
    })
}

async function getBaseBalance(walletAddress: Address): Promise<bigint> {
    const privateKey = generatePrivateKey()
    const throwawayAccount = privateKeyToAccount(privateKey)
    const client = createTestClient({
        chain: foundry,
        mode: 'anvil',
        transport: http(),
        account: throwawayAccount,
    })
        .extend(publicActions)
        .extend(walletActions)

    const balance = await client.getBalance({
        address: walletAddress,
    })
    return balance
}

async function setRiverBalance(walletAddress: Address, balance: bigint): Promise<void> {
    const privateKey = generatePrivateKey()
    const throwawayAccount = privateKeyToAccount(privateKey)
    const client = createTestClient({
        chain: foundryRiver,
        mode: 'anvil',
        transport: http(),
        account: throwawayAccount,
    })
        .extend(publicActions)
        .extend(walletActions)

    await client.setBalance({
        address: walletAddress,
        value: balance,
    })
}

async function getRiverBalance(walletAddress: Address): Promise<bigint> {
    const privateKey = generatePrivateKey()
    const throwawayAccount = privateKeyToAccount(privateKey)
    const client = createTestClient({
        chain: foundryRiver,
        mode: 'anvil',
        transport: http(),
        account: throwawayAccount,
    })
        .extend(publicActions)
        .extend(walletActions)

    const balance = await client.getBalance({
        address: walletAddress,
    })
    return balance
}

export const TestEthBalance = {
    setBaseBalance,
    getBaseBalance,
    setRiverBalance,
    getRiverBalance,
}
