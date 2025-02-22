import { createTestClient, http, publicActions, walletActions, parseEther } from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { MockERC20 } from './MockERC20'
import { deployContract, Mutex } from './TestGatingUtils'
import { Address } from './ContractTypes'
import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:TestGatingERC20')

const erc20Contracts = new Map<string, Address>()
const erc20ContractsMutex = new Mutex()

async function getContractAddress(tokenName: string): Promise<Address> {
    try {
        await erc20ContractsMutex.lock()
        if (!erc20Contracts.has(tokenName)) {
            const contractAddress = await deployContract(
                tokenName,
                MockERC20.abi,
                MockERC20.bytecode,
                ['TestERC20', 'TST'],
            )
            erc20Contracts.set(tokenName, contractAddress)
        }
    } catch (e) {
        logger.error('Failed to deploy contract', e)
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Failed to get contract address: ${tokenName}`,
        )
    } finally {
        erc20ContractsMutex.unlock()
    }

    return erc20Contracts.get(tokenName)!
}

async function publicMint(tokenName: string, toAddress: Address, amount: number): Promise<void> {
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

    logger.log('minting', contractAddress, toAddress)

    const nftReceipt = await client.writeContract({
        address: contractAddress,
        abi: MockERC20.abi,
        functionName: 'mint',
        args: [toAddress, amount],
        account: throwawayAccount,
    })

    logger.log('minted', nftReceipt)

    const receipt = await client.waitForTransactionReceipt({ hash: nftReceipt })
    expect(receipt.status).toBe('success')

    // create a filter to listen for the Transfer event to find the token id
    // don't worry about the possibility of non-matching arguments, as we're specifying the contract
    // address of the contract we're interested in.
    const filter = await client.createContractEventFilter({
        abi: MockERC20.abi,
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
            logger.log('mint logs', eventLog.args)
            return
        }
    }

    throw Error('No mint event found')
}

async function totalSupply(contractName: string): Promise<number> {
    const contractAddress = await getContractAddress(contractName)
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

    const totalSupply = await client.readContract({
        address: contractAddress,
        abi: MockERC20.abi,
        functionName: 'totalSupply',
        args: [],
    })
    return Number(totalSupply)
}

async function balanceOf(contractName: string, address: Address): Promise<number> {
    const contractAddress = await getContractAddress(contractName)
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
        abi: MockERC20.abi,
        functionName: 'balanceOf',
        args: [address],
    })

    return Number(balance)
}

async function transfer(
    contractName: string,
    to: Address,
    privateKey: `0x${string}`,
    amount: bigint,
): Promise<{ transactionHash: string }> {
    const account = privateKeyToAccount(privateKey)
    const client = createTestClient({
        chain: foundry,
        mode: 'anvil',
        transport: http(),
        account: account,
    })
        .extend(publicActions)
        .extend(walletActions)

    await client.setBalance({
        address: account.address,
        value: parseEther('1'),
    })

    const contractAddress = await getContractAddress(contractName)
    const tx = await client.writeContract({
        address: contractAddress,
        abi: MockERC20.abi,
        functionName: 'transfer',
        args: [to, amount],
    })

    const { transactionHash } = await client.waitForTransactionReceipt({ hash: tx })
    return { transactionHash }
}

export const TestERC20 = {
    getContractAddress,
    balanceOf,
    totalSupply,
    publicMint,
    transfer,
}
