import { createTestClient, http, publicActions, walletActions } from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { Address } from './ContractTypes'

async function setBalance(walletAddress: Address, balance: bigint): Promise<void> {
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

async function getBalance(walletAddress: Address): Promise<bigint> {
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

export const TestEthBalance = {
    setBalance,
    getBalance,
}
