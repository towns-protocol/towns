import { ethers } from 'ethers'
import { Environment, isErrorType } from 'worker-common'
import { createStaticProvider as createProvider } from './provider'
import { Env } from '.'
import { ContractName, EventName, FunctionName, Networks } from './types'
import { createContractMap, isSpaceSpecificContract, spaceSpecificContracts } from './contractsMap'
import { SpaceAddressFromSpaceId } from '@river-build/web3'
import { durationLogger } from './utils'

interface LogFilterResult {
    events: ethers.Event[] | null
    contractAddress: string
    eventName: EventName
    filter: ethers.EventFilter
    blockStart: number | undefined
    blockEnd: number
}

type filterArgType = string | number | null
const BaseSepoliaBlocksPerDay = 43200 // at 2s blocks
const BaseMainnetBlocksPerDay = 43200 // at 2s blocks

export const NetworkBlocksPerDay = new Map<Environment, number>([
    ['development', BaseSepoliaBlocksPerDay],
    ['test-beta', BaseSepoliaBlocksPerDay],
    ['alpha', BaseSepoliaBlocksPerDay],
    ['omega', BaseMainnetBlocksPerDay],
    ['delta', BaseMainnetBlocksPerDay],
])

// map of contract method to emitted event name
export const EventByMethod = new Map<keyof typeof FunctionName, keyof typeof EventName>([
    // RoleBase.sol
    ['createRole', 'RoleCreated'],
    ['removeRole', 'RoleRemoved'],
    ['updateRole', 'RoleUpdated'],
    // ChannelBase.sol
    ['createChannel', 'ChannelCreated'],
    ['createChannelWithOverridePermissions', 'ChannelCreated'],
    ['updateChannel', 'ChannelUpdated'],
    ['removeChannel', 'ChannelRemoved'],
    ['addRoleToChannel', 'ChannelRoleAdded'],
    ['removeRoleFromChannel', 'ChannelRoleRemoved'],
    // EntitlementsManagerBase.sol
    ['removeEntitlementModule', 'EntitlementModuleRemoved'],
    ['addEntitlementModule', 'EntitlementModuleAdded'],
    // SpaceOwnerBase.soL
    ['updateSpaceInfo', 'SpaceOwner__UpdateSpace'],
    // WalletLink.sol
    ['linkWalletToRootKey', 'LinkWalletToRootKey'],
    // Banning.sol
    ['ban', 'Banned'],
    ['unban', 'Unbanned'],
    // PrepayBase.sol
    ['prepayMembership', 'PrepayBase__Prepaid'],
    // Membership.sol
    ['setMembershipLimit', 'MembershipLimitUpdated'],
    ['setMembershipPrice', 'MembershipPriceUpdated'],
])

async function createContract<CN extends ContractName>(
    network: Networks,
    contractName: CN,
    provider: ethers.providers.Provider,
    townId: CN extends (typeof spaceSpecificContracts)[number] ? string : undefined,
): Promise<ethers.Contract | null> {
    const networkContracts = await createContractMap(network)
    if (!networkContracts) {
        console.error(`createContract:: networkContracts could not be obtained for: ${network}`)
        return null
    }
    const contractDetails = networkContracts.get(contractName)
    if (!contractDetails) {
        console.error(`Unknown contract: ${contractName}`)
        return null
    }
    if (!contractDetails.abi) {
        console.error(`Unknown contract abi: ${contractName}`)
        return null
    }

    if (isSpaceSpecificContract(contractName)) {
        if (!townId) {
            console.error(`Missing townId for space specific contract: ${contractName}`)
            return null
        }
        const spaceAddress = SpaceAddressFromSpaceId(townId)
        return new ethers.Contract(spaceAddress, contractDetails.abi, provider)
    } else {
        if (!contractDetails.address) {
            console.error(
                `No contract address for this contract mapping. Should this be the space's contract address?: ${contractName}`,
            )
            return null
        }

        return new ethers.Contract(contractDetails.address, contractDetails.abi, provider)
    }
}

export async function contractAddress(
    network: Networks,
    contractName: ContractName,
): Promise<string | null> {
    const networkContracts = await createContractMap(network)
    if (!networkContracts) {
        console.error(`createContract:: networkContracts could not be obtained for: ${network}`)
        return null
    }
    const contractDetails = networkContracts.get(contractName)
    if (!contractDetails) {
        console.error(`Unknown contract: ${contractName}`)
        return null
    }
    if (!contractDetails.address) {
        console.error(
            `No contract address for this contract mapping. Should this be the space's contract address?: ${contractName}`,
        )
        return null
    }
    return contractDetails.address
}

/* Create contract filter
 * @param contract ethers.Contract
 * @param eventName EventName
 * @param args filterArgType[] - args are spread in order. Null is used for filtering on any value
 * @return ethers.providers.Filter | null
 *
 * see: https://docs.ethers.org/v5/concepts/events/
 */
function createFilter(
    contract: ethers.Contract,
    eventName: EventName,
    args: filterArgType[],
): ethers.EventFilter | null {
    if (!Object.keys(contract.filters).includes(eventName)) {
        console.error(`Unknown event in contract: ${eventName}, ${contract.address}`)
        return null
    }
    return contract.filters[eventName](...args)
}

type FilterFunctionType = (
    contract: ethers.Contract,
    eventName: EventName,
    eventArgs: filterArgType[],
) => ethers.EventFilter | null

export function createFilterWrapper(
    contract: ethers.Contract,
    eventName: EventName,
    eventArgs: filterArgType[],
): ethers.EventFilter | null {
    const filter = createFilter(contract, eventName, [...eventArgs])
    if (!filter) {
        console.error(`Unable to create filter: ${filter}`)
        return null
    }
    return filter
}

// Run a log query using queryFilter interface on a contract
// with a fixed lookback window based on blockNumber offset
export async function runLogQuery<CN extends ContractName>(args: {
    environment: Environment
    network: Networks
    env: Env
    contractName: CN // diamond contract emitting event
    eventName: EventName // name of event to filter on
    eventArgs: filterArgType[] // args to pass into event filter
    createFilterFunc: FilterFunctionType
    blockLookbackNum?: number
    provider?: ethers.providers.StaticJsonRpcProvider
    townId: CN extends (typeof spaceSpecificContracts)[number] ? string : undefined
}): Promise<LogFilterResult | null> {
    const {
        environment,
        network,
        env,
        contractName,
        eventName,
        eventArgs,
        createFilterFunc,
        blockLookbackNum,
        provider,
        townId,
    } = args

    let rpcProvider: ethers.providers.StaticJsonRpcProvider | undefined = provider
    if (!rpcProvider) {
        console.log(`creating provider for environment ${environment}`)
        rpcProvider = createProvider(environment, env)
    }
    if (!rpcProvider) {
        console.error(`Unable to create provider`)
        return null
    }

    const contract = await createContract(network, contractName, rpcProvider, townId)
    if (!contract) {
        console.error(`Unable to create contract: ${contract}`)
        return null
    }

    const filter = createFilterFunc(contract, eventName, eventArgs)
    if (!filter) {
        console.error(`Unable to create filter: ${filter}`)
        return null
    }

    // get latest block number
    const latestBlockNumber = await rpcProvider.getBlockNumber()

    // run queryFilter with blockLookbackNum offset or undefined for all blocks
    let logs: ethers.Event[]
    const blockLookback = blockLookbackNum ? latestBlockNumber - blockLookbackNum : undefined
    try {
        console.log(
            `running queryFilter with blockLookbackNum ${blockLookbackNum}, blockLookBack ${blockLookback}, currentBlock ${latestBlockNumber}`,
        )
        console.log(`running filter: ${JSON.stringify(filter)}`)
        console.log(`running contract: ${contract.address}`)
        const queryDuration = durationLogger(`QueryFilter - ${eventName}`)
        logs = await contract.queryFilter(filter, blockLookback, latestBlockNumber)
        queryDuration()
    } catch (error) {
        console.error(
            `Unable to queryFilter: ${isErrorType(error) ? error?.message : 'Unkown error'}}`,
        )
        return null
    }
    return {
        events: logs,
        contractAddress: contract.address,
        eventName,
        filter,
        blockStart: blockLookback,
        blockEnd: latestBlockNumber,
    }
}

// Run a log query using queryFilter interface on SpaceOwner contract
// with a fixed lookback window based on blockNumber offset
/*
export async function runLogQueryTownOwner(
    environment: Environment,
    env: Env,
    eventName: EventName,
    townOwnerAddress: string,
    blockLookbackNum?: number,
    provider?: ethers.providers.StaticJsonRpcProvider,
): Promise<LogFilterResult | null> {
    let rpcProvider: ethers.providers.StaticJsonRpcProvider | undefined = provider
    if (!rpcProvider) {
        console.log(`creating provider for environment ${environment}`)
        rpcProvider = createProvider(environment, env)
    }
    if (!rpcProvider) {
        console.error(`Unable to create provider`)
        return null
    }
    const network = networkMap.get(environment)
    if (!network) {
        console.error(`Unknown environment network: ${environment}`)
        return null
    }
    const contract = createContract(network, 'SpaceOwner', rpcProvider)
    if (!contract) {
        console.error(`Unable to create contract: ${contract}`)
        return null
    }
    // filter on all Transfer events of townOwner NFT from TownFactory contract to townOwnerAddress, which is 1-1 correlated
    // with town mints
    const townFactoryAddress = contractAddress(network, 'TownFactory')
    const filter = createFilter(contract, eventName, [townFactoryAddress, townOwnerAddress])
    if (!filter) {
        console.error(`Unable to create filter: ${filter}`)
        return null
    }

    // get latest block number
    const latestBlockNumber = await rpcProvider.getBlockNumber()

    // run queryFilter with blockLookbackNum offset or undefined for all blocks
    let logs: ethers.Event[]
    const blockLookback = blockLookbackNum ? latestBlockNumber - blockLookbackNum : undefined
    try {
        console.log(
            `running queryFilter with blockLookbackNum ${blockLookbackNum}, blockLookBack ${blockLookback}, currentBlock ${latestBlockNumber}`,
        )
        console.log(`running filter: ${JSON.stringify(filter)}`)
        console.log(`running contract: ${contract.address}`)
        logs = await contract.queryFilter(filter, blockLookback, latestBlockNumber)
    } catch (error) {
        console.error(
            `Unable to queryFilter: ${isErrorType(error) ? error?.message : 'Unkown error'}}`,
        )
        return null
    }
    return {
        events: logs,
        contractAddress: contract.address,
        eventName,
        filter,
        blockStart: blockLookback,
        blockEnd: latestBlockNumber,
    }
}
*/
