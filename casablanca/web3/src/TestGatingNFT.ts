import { createTestClient, http, publicActions, walletActions } from 'viem'
import { foundry } from 'viem/chains'

import MockERC721a from './MockERC721A'
import { ethers } from 'ethers'

import { keccak256 } from 'viem/utils'

function toEIP55Address(address: `0x${string}`): `0x${string}` {
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

function isEIP55Address(address: `0x${string}`): boolean {
    return address === toEIP55Address(address)
}
const client = createTestClient({
    chain: foundry,
    mode: 'anvil',
    transport: http(),
})
    .extend(publicActions)
    .extend(walletActions)

function isHexString(value: any): value is `0x${string}` {
    return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)
}
export class TestGatingNFT {
    // rome-ignore lint/complexity/noUselessConstructor: <explanation>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor(_chainId: number, _provider: ethers.providers.Provider, _wallet: ethers.Wallet) {}
    public async publicMint(toAddress: string) {
        if (!isHexString(toAddress)) {
            throw new Error('Invalid address')
        }

        return await publicMint('TestGatingNFT', toAddress)
    }
}

const nftContracts = new Map<string, `0x${string}`>()

export async function getContractAddress(nftName: string): Promise<`0x${string}`> {
    if (!nftContracts.has(nftName)) {
        const account = (await client.getAddresses())[0]

        const hash = await client.deployContract({
            abi: MockERC721a.abi,
            account,
            bytecode: MockERC721a.bytecode.object,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.contractAddress) {
            console.log(
                'deployed',
                nftName,
                receipt.contractAddress,
                isEIP55Address(receipt.contractAddress),
            )
            // For some reason the address isn't in EIP-55, so we need to checksum it
            nftContracts.set(nftName, toEIP55Address(receipt.contractAddress))
        } else {
            throw new Error('Failed to deploy contract')
        }
    }

    const contractAddress = nftContracts.get(nftName)
    if (!contractAddress) {
        throw new Error('Failed to get contract address')
    }

    return contractAddress
}

export async function getTestGatingNFTContractAddress(): Promise<`0x${string}`> {
    return await getContractAddress('TestGatingNFT')
}

export async function publicMint(nftName: string, toAddress: `0x${string}`) {
    const account = (await client.getAddresses())[0]

    const contractAddress = await getContractAddress(nftName)

    console.log('minting', contractAddress, toAddress, account)

    const nftReceipt = await client.writeContract({
        address: contractAddress,
        abi: MockERC721a.abi,
        functionName: 'mint',
        args: [toAddress, 1n],
        account,
    })

    await client.waitForTransactionReceipt({ hash: nftReceipt })
}
