import {
    Abi,
    AbiParametersToPrimitiveTypes,
    ExtractAbiFunction,
    ExtractAbiFunctionNames,
} from 'abitype'
import { TransactionReceipt } from 'viem'

// TODO
export type ViemExternalTokenStruct = {
    contractAddress: string
    quantity: bigint
    isSingleToken: boolean
    tokenIds: bigint[]
}

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
