import {
    createTestClient,
    createWalletClient,
    http,
    parseEventLogs,
    publicActions,
    zeroAddress,
} from 'viem'
import { anvil, foundry } from 'viem/chains'
import { getContractAddress } from '../utils/contractAddresses'
import {
    spaceOwnerAbi as _spaceOwnerAbi,
    guardianFacetAbi,
    createSpaceFacetAbi,
    pricingModulesFacetAbi,
} from '@towns-protocol/contracts/typings'
import { generatePrivateKey, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'
import { mergeAbis } from 'ponder'
import { waitForTransactionReceipt } from 'viem/actions'

const ENV = 'local_dev'
const RPC = 'http://localhost:8545'
const anvilDeployer = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

const spaceOwnerAbi = mergeAbis([_spaceOwnerAbi, guardianFacetAbi])

const anvilClient = createTestClient({
    transport: http(RPC),
    mode: 'anvil',
    chain: anvil,
}).extend(publicActions)

const walletClient = createWalletClient({
    account: mnemonicToAccount('test test test test test test test test test test test junk'),
    chain: foundry,
    transport: http(RPC),
})

const spaceOwner = getContractAddress('spaceOwner', 'base', ENV, {
    debug: true,
})

const spaceFactory = getContractAddress('spaceFactory', 'base', ENV, {
    debug: true,
})

if (!spaceOwner || !spaceFactory) {
    throw new Error('Space owner or space factory address not found')
}
console.log('\n\n\n')
console.log('Setting default cooldown to 2 seconds')
const tx = await walletClient.writeContract({
    address: spaceOwner,
    abi: spaceOwnerAbi,
    functionName: 'setDefaultCooldown',
    args: [2n],
})

await waitForTransactionReceipt(anvilClient, {
    hash: tx,
})

const defaultCooldown = await anvilClient.readContract({
    address: spaceOwner,
    abi: spaceOwnerAbi,
    functionName: 'getDefaultCooldown',
})

console.log('Set default cooldown:', defaultCooldown)
console.log('\n\n')
console.log('Creating space')

const spaceFactoryAbi = mergeAbis([createSpaceFacetAbi, pricingModulesFacetAbi])

const pricingModules = await anvilClient.readContract({
    address: spaceFactory,
    abi: spaceFactoryAbi,
    functionName: 'listPricingModules',
})

const fixedPricingModule = pricingModules.find((module) => module.name === 'FixedPricing')?.module

if (!fixedPricingModule) {
    throw new Error('Fixed pricing module not found')
}

const createSpaceTx = await walletClient.writeContract({
    address: spaceFactory,
    abi: spaceFactoryAbi,
    functionName: 'createSpace',
    args: [
        {
            name: 'Test Space',
            uri: 'https://test.space',
            shortDescription: 'Test Space',
            longDescription: 'Test Space',
            membership: {
                settings: {
                    name: 'Test Membership',
                    symbol: 'TEST',
                    price: 0n,
                    maxSupply: 10n,
                    duration: 1000n,
                    currency: zeroAddress,
                    feeRecipient: zeroAddress,
                    freeAllocation: 0n,
                    pricingModule: fixedPricingModule,
                },
                requirements: {
                    everyone: true,
                    users: [],
                    ruleData: '0x',
                    syncEntitlements: true,
                },
                permissions: [],
            },
            channel: {
                metadata: 'channel',
            },
        },
    ],
})

const receipt = await waitForTransactionReceipt(anvilClient, {
    hash: createSpaceTx,
})

const spaceIdFromLogs = parseEventLogs({
    abi: spaceFactoryAbi,
    logs: receipt.logs,
    eventName: 'SpaceCreated',
})

const spaceId = spaceIdFromLogs[0]?.args.space
const tokenId = spaceIdFromLogs[0]?.args.tokenId

if (!spaceId) {
    throw new Error('Space ID not found')
}
if (!tokenId) {
    throw new Error('Token ID not found')
}

console.log('Space ID:', spaceId)

const randomAccount = privateKeyToAccount(generatePrivateKey())
const newOwner = randomAccount.address

const disableGuardianTx = await walletClient
    .writeContract({
        address: spaceOwner,
        abi: spaceOwnerAbi,
        functionName: 'disableGuardian',
        args: [],
    })
    .catch((error) => {
        const errorData = error.cause?.data
        const errorName = errorData?.errorName

        if (errorName === 'Guardian_AlreadyDisabled') {
            console.log('Guardian already disabled')
        } else {
            throw error
        }
    })

if (disableGuardianTx) {
    await waitForTransactionReceipt(anvilClient, {
        hash: disableGuardianTx,
    })
}

await new Promise((resolve) => setTimeout(resolve, 2_000))

const transferOwnershipTx = await walletClient.writeContract({
    address: spaceOwner,
    abi: spaceOwnerAbi,
    functionName: 'transferFrom',
    args: [walletClient.account.address, newOwner, tokenId],
})

await waitForTransactionReceipt(anvilClient, {
    hash: transferOwnershipTx,
})

console.log(`Space ${spaceId} transferred to ${newOwner}`)
console.log(`run this query in the subgraph server to confirm index:
    {
        space(id: "${spaceId}") {
            id
            owner
            tokenId
        }
    }

    `)
