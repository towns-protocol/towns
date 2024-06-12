import { createTestClient, http, publicActions, walletActions } from 'viem'
import { foundry } from 'viem/chains'

import MockERC721a from './MockERC721A'

import { keccak256, parseEther } from 'viem/utils'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:TestGatingNFT')

export function toEIP55Address(address: `0x${string}`): `0x${string}` {
    const addressHash = keccak256(address.substring(2).toLowerCase() as `0x${string}`)
    let checksumAddress = '0x'

    for (let i = 2; i < address.length; i++) {
        if (parseInt(addressHash[i], 16) >= 8) {
            checksumAddress += address[i].toUpperCase()
        } else {
            checksumAddress += address[i].toLowerCase()
        }
    }

    return checksumAddress as `0x${string}`
}

export function isEIP55Address(address: `0x${string}`): boolean {
    return address === toEIP55Address(address)
}
/*
 */
export function isHexString(value: unknown): value is `0x${string}` {
    // Check if the value is undefined first
    if (value === undefined) {
        return false
    }
    return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)
}
export class TestGatingNFT {
    public async publicMint(toAddress: string) {
        if (!isHexString(toAddress)) {
            throw new Error('Invalid address')
        }

        return await publicMint('TestGatingNFT', toAddress)
    }
}

class Mutex {
    queue: ((value: void | PromiseLike<void>) => void)[]
    locked: boolean
    constructor() {
        this.queue = []
        this.locked = false
    }

    lock() {
        if (!this.locked) {
            this.locked = true
            return Promise.resolve()
        }

        let unlockNext: (value: void | PromiseLike<void>) => void

        const promise = new Promise<void>((resolve) => {
            unlockNext = resolve
        })

        this.queue.push(unlockNext!)

        return promise
    }

    unlock() {
        if (this.queue.length > 0) {
            const unlockNext = this.queue.shift()
            unlockNext?.()
        } else {
            this.locked = false
        }
    }
}

const nftContracts = new Map<string, `0x${string}`>()
const nftContractsMutex = new Mutex()

export async function getContractAddress(nftName: string): Promise<`0x${string}`> {
    let retryCount = 0
    let lastError: unknown
    try {
        // If mulitple callers are in a Promise.all() and they all try to deploy the same contract at the same time,
        // we want to make sure that only one of them actually deploys the contract.
        await nftContractsMutex.lock()

        if (!nftContracts.has(nftName)) {
            while (retryCount++ < 5) {
                try {
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

                    const hash = await client.deployContract({
                        abi: MockERC721a.abi,
                        account: throwawayAccount,
                        bytecode: MockERC721a.bytecode.object,
                    })

                    const receipt = await client.waitForTransactionReceipt({ hash })

                    if (receipt.contractAddress) {
                        logger.info(
                            'deployed',
                            nftName,
                            receipt.contractAddress,
                            isEIP55Address(receipt.contractAddress),
                            nftContracts,
                        )
                        // For some reason the address isn't in EIP-55, so we need to checksum it
                        nftContracts.set(nftName, toEIP55Address(receipt.contractAddress))
                    } else {
                        throw new Error('Failed to deploy contract')
                    }
                    break
                } catch (e) {
                    lastError = e
                    if (
                        typeof e === 'object' &&
                        e !== null &&
                        'message' in e &&
                        typeof e.message === 'string' &&
                        (e.message.includes('nonce too low') ||
                            e.message.includes('NonceTooLowError') ||
                            e.message.includes(
                                'Nonce provided for the transaction is lower than the current nonce',
                            ))
                    ) {
                        logger.log('retrying because nonce too low', e, retryCount)
                    } else {
                        throw e
                    }
                }
            }
        }
    } finally {
        nftContractsMutex.unlock()
    }

    const contractAddress = nftContracts.get(nftName)
    if (!contractAddress) {
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Failed to get contract address: ${nftName} retryCount: ${retryCount} lastError: ${lastError} `,
        )
    }

    return contractAddress
}

export async function getTestGatingNFTContractAddress(): Promise<`0x${string}`> {
    return await getContractAddress('TestGatingNFT')
}

export async function publicMint(nftName: string, toAddress: `0x${string}`) {
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

    const contractAddress = await getContractAddress(nftName)

    logger.log('minting', contractAddress, toAddress)

    const nftReceipt = await client.writeContract({
        address: contractAddress,
        abi: MockERC721a.abi,
        functionName: 'mint',
        args: [toAddress, 1n],
        account: throwawayAccount,
    })
    logger.log('minted', nftReceipt)

    const receipt = await client.waitForTransactionReceipt({ hash: nftReceipt })
    expect(receipt.status).toBe('success')
}
