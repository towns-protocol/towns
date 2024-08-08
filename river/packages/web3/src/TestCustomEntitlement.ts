import { createTestClient, http, publicActions, walletActions, parseEther } from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { MockCustomEntitlement } from './MockCustomEntitlement'
import { deployContract, Mutex } from './TestGatingUtils'
import { Address } from './ContractTypes'

import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:TestGatingERC20')

const mockCustomContracts = new Map<string, Address>()
const mockCustomContractsMutex = new Mutex()

async function getContractAddress(tokenName: string): Promise<Address> {
    try {
        await mockCustomContractsMutex.lock()
        if (!mockCustomContracts.has(tokenName)) {
            const contractAddress = await deployContract(
                tokenName,
                MockCustomEntitlement.abi,
                MockCustomEntitlement.bytecode,
            )
            mockCustomContracts.set(tokenName, contractAddress)
        }
    } catch (e) {
        logger.error('Failed to deploy contract', e)
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Failed to get contract address: ${tokenName}`,
        )
    } finally {
        mockCustomContractsMutex.unlock()
    }

    return mockCustomContracts.get(tokenName)!
}

async function setEntitled(
    customEntitlementContractName: string,
    userAddresses: Address[],
    entitled: boolean,
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

    const contractAddress = await getContractAddress(customEntitlementContractName)

    logger.log(
        `Setting custom entitlement to ${entitled} for users ${userAddresses.join(
            ',',
        )} for contract ${customEntitlementContractName}`,
    )
    const txnReceipt = await client.writeContract({
        address: contractAddress,
        abi: MockCustomEntitlement.abi,
        functionName: 'setEntitled',
        args: [userAddresses, entitled],
        account: throwawayAccount,
    })

    const receipt = await client.waitForTransactionReceipt({ hash: txnReceipt })
    expect(receipt.status).toBe('success')
    logger.log(
        `Set custom entitlement to ${entitled} for users ${userAddresses.join(
            ',',
        )} for contract ${customEntitlementContractName}`,
    )
}

async function isEntitled(
    customEntitlementContractName: string,
    userAddresses: Address[],
): Promise<boolean> {
    const contractAddress = await getContractAddress(customEntitlementContractName)
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

    const result = await client.readContract({
        address: contractAddress,
        abi: MockCustomEntitlement.abi,
        functionName: 'isEntitled',
        args: [userAddresses],
    })

    return result as boolean
}

export const TestCustomEntitlement = {
    getContractAddress,
    setEntitled,
    isEntitled,
}
