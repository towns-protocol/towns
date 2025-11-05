import { createTestClient, http, publicActions, walletActions, parseEther } from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { MockERC1155 } from './MockERC1155'
import { deployContract, Mutex } from './TestGatingUtils'
import { Address } from '../types/ContractTypes'
import { dlogger } from '@towns-protocol/utils'

const logger = dlogger('csb:TestGatingERC1155')

const erc1155Contracts = new Map<string, Address>()
const erc1155ContractsMutex = new Mutex()

export enum TestTokenId {
    Gold = 1,
    Silver = 2,
    Bronze = 3,
}

async function getContractAddress(tokenName: string): Promise<Address> {
    try {
        await erc1155ContractsMutex.lock()
        if (!erc1155Contracts.has(tokenName)) {
            const contractAddress = await deployContract(
                tokenName,
                MockERC1155.abi,
                MockERC1155.bytecode,
            )
            erc1155Contracts.set(tokenName, contractAddress)
        }
    } catch (e) {
        logger.error('Failed to deploy contract', e)
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Failed to get contract address: ${tokenName}`,
        )
    } finally {
        erc1155ContractsMutex.unlock()
    }

    return erc1155Contracts.get(tokenName)!
}

async function publicMint(
    tokenName: string,
    toAddress: Address,
    tokenId: TestTokenId,
): Promise<void> {
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
        address: throwawayAccount.address,
        value: parseEther('1'),
    })

    const contractAddress = await getContractAddress(tokenName)

    let functionName: string
    switch (tokenId) {
        case TestTokenId.Gold:
            functionName = 'mintGold'
            break
        case TestTokenId.Silver:
            functionName = 'mintSilver'
            break
        case TestTokenId.Bronze:
            functionName = 'mintBronze'
            break
        default:
            throw new Error(`Invalid token id: ${tokenId as any}`)
    }

    const txn = await client.writeContract({
        address: contractAddress,
        abi: MockERC1155.abi,
        functionName,
        args: [toAddress],
        account: throwawayAccount,
    })

    await client.waitForTransactionReceipt({ hash: txn })
}

async function balanceOf(
    tokenName: string,
    address: Address,
    tokenId: TestTokenId,
): Promise<number> {
    const contractAddress = await getContractAddress(tokenName)
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

    const balance = await client.readContract({
        address: contractAddress,
        abi: MockERC1155.abi,
        functionName: 'balanceOf',
        args: [address, tokenId],
    })
    return Number(balance)
}

export const TestERC1155 = {
    TestTokenId,
    getContractAddress,
    balanceOf,
    publicMint,
}
