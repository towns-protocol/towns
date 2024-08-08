import { keccak256, parseEther } from 'viem/utils'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createTestClient, http, publicActions, walletActions } from 'viem'

import type { Abi } from 'abitype'

import { Address } from './ContractTypes'

import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:TestGatingUtils')

export class Mutex {
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

export function toEIP55Address(address: Address): Address {
    const addressHash = keccak256(address.substring(2).toLowerCase() as Address)
    let checksumAddress = '0x'

    for (let i = 2; i < address.length; i++) {
        if (parseInt(addressHash[i], 16) >= 8) {
            checksumAddress += address[i].toUpperCase()
        } else {
            checksumAddress += address[i].toLowerCase()
        }
    }

    return checksumAddress as Address
}

export function isEIP55Address(address: Address): boolean {
    return address === toEIP55Address(address)
}

export function isHexString(value: unknown): value is Address {
    // Check if the value is undefined first
    if (value === undefined) {
        return false
    }
    return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)
}

export async function deployContract(
    contractName: string,
    abi: Abi,
    bytecode: Address, // bytecode is a hex string
    constructorArgs: any[] = [],
): Promise<Address> {
    let retryCount = 0
    let lastError: unknown
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
                abi,
                account: throwawayAccount,
                args: constructorArgs,
                bytecode,
            })

            const receipt = await client.waitForTransactionReceipt({ hash })

            if (receipt.contractAddress) {
                logger.info(
                    'deployed',
                    receipt.contractAddress,
                    isEIP55Address(receipt.contractAddress),
                )
                return toEIP55Address(receipt.contractAddress)
            } else {
                throw new Error(`Failed to deploy contract ${contractName}`)
            }
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
                logger.log('retrying because nonce too low', e, retryCount, contractName)
            } else {
                throw e
            }
        }
    }
    throw lastError
}
