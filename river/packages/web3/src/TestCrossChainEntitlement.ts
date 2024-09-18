import {
    createTestClient,
    http,
    publicActions,
    walletActions,
    parseEther,
    encodeAbiParameters,
    Hex,
} from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { MockCrossChainEntitlement } from './MockCrossChainEntitlement'
import { deployContract, Mutex } from './TestGatingUtils'
import { Address } from './ContractTypes'

import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:TestGatingCrossChainEntitlement')

const mockCrossChainEntitlementContracts = new Map<string, Address>()
const mockCrossChainEntitlementsMutex = new Mutex()

async function getContractAddress(tokenName: string): Promise<Address> {
    try {
        await mockCrossChainEntitlementsMutex.lock()
        if (!mockCrossChainEntitlementContracts.has(tokenName)) {
            const contractAddress = await deployContract(
                tokenName,
                MockCrossChainEntitlement.abi,
                MockCrossChainEntitlement.bytecode,
            )
            mockCrossChainEntitlementContracts.set(tokenName, contractAddress)
        }
    } catch (e) {
        logger.error('Failed to deploy contract', e)
        throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Failed to get contract address: ${tokenName}`,
        )
    } finally {
        mockCrossChainEntitlementsMutex.unlock()
    }

    return mockCrossChainEntitlementContracts.get(tokenName)!
}

async function setIsEntitled(
    contractName: string,
    userAddress: Address,
    id: bigint,
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

    const contractAddress = await getContractAddress(contractName)

    logger.log(
        `Setting cross chain entitlement to ${entitled} for user ${userAddress} ` +
            `with id ${id} on contract ${contractName} at address ${contractAddress}`,
    )
    const txnReceipt = await client.writeContract({
        address: contractAddress,
        abi: MockCrossChainEntitlement.abi,
        functionName: 'setIsEntitled',
        args: [id, userAddress, entitled],
        account: throwawayAccount,
    })

    const receipt = await client.waitForTransactionReceipt({ hash: txnReceipt })
    expect(receipt.status).toBe('success')
}

async function isEntitled(
    customEntitlementContractName: string,
    userAddresses: Address[],
    id: bigint,
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

    const encodedId = encodeIdParameter(id)
    const result = await client.readContract({
        address: contractAddress,
        abi: MockCrossChainEntitlement.abi,
        functionName: 'isEntitled',
        args: [userAddresses, encodedId],
    })

    return result as boolean
}

const mockCrossChainEntitlementParamsAbi = {
    components: [
        {
            name: 'id',
            type: 'uint256',
        },
    ],
    name: 'params',
    type: 'tuple',
} as const

function encodeIdParameter(id: bigint): Hex {
    if (id < 0n) {
        throw new Error(`Invalid id ${id}: must be nonnegative`)
    }
    return encodeAbiParameters([mockCrossChainEntitlementParamsAbi], [{ id }])
}

export const TestCrossChainEntitlement = {
    getContractAddress,
    encodeIdParameter,
    setIsEntitled,
    isEntitled,
}
