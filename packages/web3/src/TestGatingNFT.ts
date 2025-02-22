import { createTestClient, http, publicActions, walletActions, parseEther } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'

import { MockERC721a } from './MockERC721A'

import { isHexString, deployContract, Mutex } from './TestGatingUtils'
import { Address } from './ContractTypes'

import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:TestGatingNFT')

export class TestGatingNFT {
    public async publicMint(toAddress: string) {
        if (!isHexString(toAddress)) {
            throw new Error('Invalid address')
        }

        return await publicMint('TestGatingNFT', toAddress)
    }
}

const nftContracts = new Map<string, Address>()
const nftContractsMutex = new Mutex()

async function getContractAddress(nftName: string): Promise<Address> {
    try {
        await nftContractsMutex.lock()
        if (!nftContracts.has(nftName)) {
            const contractAddress = await deployContract(
                nftName,
                MockERC721a.abi,
                MockERC721a.bytecode.object,
            )
            nftContracts.set(nftName, contractAddress)
        }
    } catch (e) {
        logger.error('Failed to deploy contract', e)
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Failed to get contract address: ${nftName}`,
        )
    } finally {
        nftContractsMutex.unlock()
    }

    return nftContracts.get(nftName)!
}

export async function getTestGatingNFTContractAddress(): Promise<Address> {
    return await getContractAddress('TestGatingNFT')
}

async function publicMint(nftName: string, toAddress: Address): Promise<number> {
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

    // create a filter to listen for the Transfer event to find the token id
    // don't worry about the possibility of non-matching arguments, as we're specifying the contract
    // address of the contract we're interested in.
    const filter = await client.createContractEventFilter({
        abi: MockERC721a.abi,
        address: contractAddress,
        eventName: 'Transfer',
        args: {
            to: toAddress,
        },
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
    })
    const eventLogs = await client.getFilterLogs({ filter })
    for (const eventLog of eventLogs) {
        if (eventLog.transactionHash === receipt.transactionHash) {
            expect(eventLog.args.tokenId).toBeDefined()
            return Number(eventLog.args.tokenId)
        }
    }

    throw Error('No mint event found')
}

async function burn(nftName: string, tokenId: number): Promise<void> {
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

    const nftReceipt = await client.writeContract({
        address: await getContractAddress(nftName),
        abi: MockERC721a.abi,
        functionName: 'burn',
        args: [BigInt(tokenId)],
        account: throwawayAccount,
    })

    const receipt = await client.waitForTransactionReceipt({ hash: nftReceipt })
    expect(receipt.status).toBe('success')
}

async function balanceOf(nftName: string, address: Address): Promise<number> {
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

    const contractAddress = await getContractAddress(nftName)

    const balanceEncoded = await client.readContract({
        address: contractAddress,
        abi: MockERC721a.abi,
        functionName: 'balanceOf',
        args: [address],
    })

    return Number(balanceEncoded)
}

export const TestERC721 = {
    publicMint,
    burn,
    balanceOf,
    getContractAddress,
}
