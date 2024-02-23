import { ethers } from 'ethers'
import { Environment, isErrorType } from 'worker-common'
import BaseSepoliaTownOwnerAbi from '@towns/generated/v3/abis/TownOwner.abi.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAbi from '@towns/generated/v3/abis/WalletLink.abi.json' assert { type: 'json' }
import BaseSepoliaTownOwnerContract from '@towns/generated/addresses/base_sepolia/townOwner.json' assert { type: 'json' }
import BaseSepoliaChannelsAbi from '@towns/generated/v3/abis/Channels.abi.json' assert { type: 'json' }
import BaseSepoliaRolesAbi from '@towns/generated/v3/abis/Roles.abi.json' assert { type: 'json' }
import BaseSepoliaTownFactoryContract from '@towns/generated/addresses/base_sepolia/townFactory.json' assert { type: 'json' }
import BaseSepoliaTownContract from '@towns/generated/addresses/base_sepolia/town.json' assert { type: 'json' }
import BaseSepoliaWalletLinkContract from '@towns/generated/addresses/base_sepolia/walletLink.json' assert { type: 'json' }
import { createJsonProvider as createProvider } from './provider'
import { Env } from '.'

interface ContractDetails {
    address: string
    abi: ethers.ContractInterface | undefined
}

interface LogFilterResult {
    events: ethers.Event[] | null
    contractAddress: string
    eventName: string
    filter: ethers.EventFilter
    blockStart: number | undefined
    blockEnd: number
}

type filterArgType = string | number | null
const BaseSepoliaBlocksPerDay = 43200 // at 2s blocks

const BaseSepoliaContracts = new Map<string, ContractDetails>([
    ['TownOwner', { address: BaseSepoliaTownOwnerContract.address, abi: BaseSepoliaTownOwnerAbi }],
    ['TownFactory', { address: BaseSepoliaTownFactoryContract.address, abi: undefined }],
    ['Town', { address: BaseSepoliaTownContract.address, abi: undefined }],
    [
        'WalletLink',
        { address: BaseSepoliaWalletLinkContract.address, abi: BaseSepoliaWalletLinkAbi },
    ],
    ['Channels', { address: BaseSepoliaTownContract.address, abi: BaseSepoliaChannelsAbi }],
    ['Roles', { address: BaseSepoliaTownContract.address, abi: BaseSepoliaRolesAbi }],
])

const NetworkContracts = new Map<string, Map<string, ContractDetails>>([
    ['base_sepolia', BaseSepoliaContracts],
])

export const NetworkBlocksPerDay = new Map<Environment, number>([
    ['test-beta', BaseSepoliaBlocksPerDay],
])

// map of contract method to emitted event name
export const EventByMethod = new Map<string, string>([
    // RoleBase.sol
    ['createRole', 'RoleCreated'],
    ['removeRole', 'RoleRemoved'],
    ['updateRole', 'RoleUpdated'],
    // ChannelBase.sol
    ['createChannel', 'ChannelCreated'],
    ['updateChannel', 'ChannelUpdated'],
    ['removeChannel', 'ChannelRemoved'],
    ['addRoleToChannel', 'ChannelRoleAdded'],
    ['removeRoleFromChannel', 'ChannelRoleRemoved'],
    // EntitlementsManagerBase.sol
    ['removeEntitlementModule', 'EntitlementModuleRemoved'],
    ['addEntitlementModule', 'EntitlementModuleAdded'],
    // TownOwnerBase.soL
    ['updateTownInfo', 'TownOwner__UpdateTown'],
    // WalletLink.sol
    ['linkWalletToRootKey', 'LinkWalletToRootKey'],
])

function createContract(
    network: string,
    contractName: string,
    provider: ethers.providers.Provider,
): ethers.Contract | null {
    const networkContracts = NetworkContracts.get(network)
    if (!networkContracts) {
        console.error(`Unknown network: ${network}`)
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
    return new ethers.Contract(contractDetails.address, contractDetails.abi, provider)
}

export function contractAddress(network: string, contractName: string): string | null {
    const networkContracts = NetworkContracts.get(network)
    if (!networkContracts) {
        console.error(`Unknown network: ${network}`)
        return null
    }
    const contractDetails = networkContracts.get(contractName)
    if (!contractDetails) {
        console.error(`Unknown contract: ${contractName}`)
        return null
    }
    return contractDetails.address
}

/* Create contract filter
 * @param contract ethers.Contract
 * @param eventName string
 * @param args filterArgType[] - args are spread in order. Null is used for filtering on any value
 * @return ethers.providers.Filter | null
 *
 * see: https://docs.ethers.org/v5/concepts/events/
 */
function createFilter(
    contract: ethers.Contract,
    eventName: string,
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
    eventName: string,
    eventArgs: filterArgType[],
) => ethers.EventFilter | null

export function createFilterWrapper(
    contract: ethers.Contract,
    eventName: string,
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
export async function runLogQuery(
    environment: Environment,
    network: string,
    env: Env,
    contractName: string, // diamond contract emitting event
    eventName: string, // name of event to filter on
    eventArgs: filterArgType[], // args to pass into event filter
    createFilterFunc: FilterFunctionType,
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

    const contract = createContract(network, contractName, rpcProvider)
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

// Run a log query using queryFilter interface on TownOwner contract
// with a fixed lookback window based on blockNumber offset
/*
export async function runLogQueryTownOwner(
    environment: Environment,
    env: Env,
    eventName: string,
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
    const contract = createContract(network, 'TownOwner', rpcProvider)
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
