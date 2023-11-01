import ChannelsLocalhostAbi from '@towns/generated/localhost/v3/abis/Channels.abi'
import TownOwnerLocalhostAbi from '@towns/generated/localhost/v3/abis/TownOwner.abi'
import RolesLocalhostAbi from '@towns/generated/localhost/v3/abis/Roles.abi'
import TownArchitectLocalhostAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi'
import TokenEntitlementLocalhostAbi from '@towns/generated/localhost/v3/abis/TokenEntitlement.abi'

import {
    Abi,
    AbiParametersToPrimitiveTypes,
    ExtractAbiFunction,
    ExtractAbiFunctionNames,
} from 'abitype'
import { TransactionReceipt } from 'viem'

export type ContractFunctionNames<A extends Abi> = ExtractAbiFunctionNames<A>

export type ContractFunctionInputs<
    A extends Abi,
    Name extends ContractFunctionNames<A>,
> = AbiParametersToPrimitiveTypes<ExtractAbiFunction<A, Name>['inputs']>

export type ContractFunctionOutputs<
    A extends Abi,
    Name extends ContractFunctionNames<A>,
> = AbiParametersToPrimitiveTypes<ExtractAbiFunction<A, Name>['outputs']>

export type SpaceDappTransaction = {
    hash: `0x${string}`
    wait: (confirmations?: number) => Promise<TransactionReceipt>
}

/**
 * types that are used in client code
 * TODO: look into autogenerating these?
 */
export interface IChannelBase {
    // first parameter to `getChannels`
    ChannelStructOutput: ContractFunctionOutputs<typeof ChannelsLocalhostAbi, 'getChannel'>[0]
}

export interface ITownOwnerBase {
    TownStruct: ContractFunctionOutputs<typeof TownOwnerLocalhostAbi, 'getTownInfo'>[0]
}

export interface IRolesBase {
    RoleStructOutput: ContractFunctionOutputs<typeof RolesLocalhostAbi, 'getRoleById'>[0]
    CreateEntitlementStruct: ContractFunctionInputs<typeof RolesLocalhostAbi, 'createRole'>['2'][0]
}

type MembershipStruct = ContractFunctionInputs<typeof TownArchitectLocalhostAbi, 'computeTown'>[1]
export interface ITownArchitectBase {
    MembershipStruct: MembershipStruct
    MembershipInfoStruct: MembershipStruct['settings']
    TownStruct: ContractFunctionInputs<typeof TownArchitectLocalhostAbi, 'createTown'>[0]
}

export interface TokenEntitlementDataTypes {
    // get a single array element encodeExternalTokens to match previous ethers type
    ExternalTokenStruct: ContractFunctionInputs<
        typeof TokenEntitlementLocalhostAbi,
        'encodeExternalTokens'
    >[0][0]
}
