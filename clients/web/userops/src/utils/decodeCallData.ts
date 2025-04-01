import { Address } from '@towns-protocol/web3'
import { FunctionHash } from '../types'
import { decodeTransferCallData } from './generateTransferCallData'
import { decodeFunctionData, Hex } from 'viem'
import {
    decodeExecuteAbi as simpleDecodeExecuteAbi,
    decodeExecuteBatchAbi as simpleDecodeExecuteBatchAbi,
} from '../lib/permissionless/accounts/simple/abi'
import {
    modularDecodeExecute,
    modularDecodeExecuteBatch,
} from '../lib/permissionless/accounts/modular/utils'

type SingleExecuteData = {
    type: 'single'
    toAddress: Address
    value: bigint
    decodedCallData: Hex
}

type BatchExecuteData = {
    type: 'batch'
    toAddress: Address[]
    decodedCallData: Hex[]
    value: bigint[]
}

type ExecuteData = SingleExecuteData | BatchExecuteData

type DecodedSingleCallData<F extends FunctionHash> = {
    toAddress: Address
    value: bigint
    executeData: Hex
    functionHash: F | undefined
    functionData?: unknown
    executeType: 'single'
}

type DecodedBatchCallData<F extends FunctionHash> = {
    toAddress: Address[]
    executeData: Hex[]
    // single value that represents the sum of all values in the batch
    value: bigint
    functionHash: F | undefined
    functionData?: unknown
    executeType: 'batch'
}

type DecodedCallData<F extends FunctionHash> = DecodedSingleCallData<F> | DecodedBatchCallData<F>

type PrepayMembershipData = {
    toAddress: Address
    value: bigint
    functionHash: 'prepayMembership'
    functionData: {
        supply: bigint
    }
}

type TransferTokensData = {
    toAddress: Address
    value: bigint
    functionHash: 'transferTokens'
    functionData: {
        fromAddress: Address
        recipient: Address
        tokenId: string
    }
}

type WithdrawData = {
    toAddress: Address
    value: bigint
    functionHash: 'withdraw'
    functionData: {
        recipient: Address
    }
}

type TransferEthData = {
    toAddress: Address
    value: bigint
    functionHash: 'transferEth'
}

export function decodeCallData<F extends FunctionHash>(args: {
    callData: Hex
    functionHash: F | undefined
}) {
    const { callData, functionHash } = args

    let executeData: ExecuteData
    try {
        const [_toAddress, _value, _dataBytes] = simpleDecodeExecuteAbi(callData).args
        executeData = {
            type: 'single',
            toAddress: _toAddress,
            value: _value,
            decodedCallData: _dataBytes,
        }
    } catch (error) {
        try {
            const [_toAddress, _value, _dataBytes] = modularDecodeExecute(callData).args
            executeData = {
                type: 'single',
                toAddress: _toAddress,
                value: _value,
                decodedCallData: _dataBytes,
            }
        } catch {
            try {
                const [_toAddress, _dataBytes] = simpleDecodeExecuteBatchAbi(callData).args
                executeData = {
                    type: 'batch',
                    toAddress: _toAddress as Address[],
                    value: _toAddress.map(() => 0n),
                    decodedCallData: _dataBytes as Hex[],
                }
            } catch {
                try {
                    const [args] = modularDecodeExecuteBatch(callData).args
                    executeData = {
                        type: 'batch',
                        toAddress: args.map((arg) => arg.target),
                        value: args.map((arg) => arg.value),
                        decodedCallData: args.map((arg) => arg.data),
                    }
                } catch {
                    throw new Error('failed to decode call data')
                }
            }
        }
    }

    let data: DecodedCallData<F>
    const summedValue =
        executeData.type === 'single'
            ? executeData.value
            : executeData.value.reduce((acc, curr) => acc + curr, 0n)

    if (executeData.type === 'single') {
        data = {
            toAddress: executeData.toAddress,
            value: summedValue,
            executeData: executeData.decodedCallData,
            functionHash,
            executeType: 'single',
        }
    } else if (executeData.type === 'batch') {
        data = {
            toAddress: executeData.toAddress,
            executeData: executeData.decodedCallData,
            functionHash,
            value: summedValue,
            executeType: 'batch',
        }
    } else {
        throw new Error('failed to decode call data')
    }

    try {
        switch (functionHash) {
            case 'prepayMembership': {
                let supply: bigint | undefined
                let toAddress: Address | undefined
                if (executeData.type !== 'single') {
                    for (let i = 0; i < executeData.decodedCallData.length; i++) {
                        try {
                            supply = decodePrepayMembership(executeData.decodedCallData[i])[0]
                            toAddress = executeData.toAddress[i]
                        } catch (error) {
                            // noop
                        }
                    }
                } else {
                    supply = decodePrepayMembership(executeData.decodedCallData)[0]
                }

                if (supply === undefined || toAddress === undefined) {
                    break
                }

                return {
                    toAddress,
                    value: summedValue,
                    functionHash,
                    functionData: {
                        supply,
                    },
                } satisfies PrepayMembershipData
            }
            case 'transferTokens': {
                let fromAddress: Address | undefined
                let recipient: Address | undefined
                let tokenId: bigint | undefined
                let toAddress: Address | undefined
                if (executeData.type !== 'single') {
                    for (let i = 0; i < executeData.decodedCallData.length; i++) {
                        try {
                            ;[fromAddress, recipient, tokenId] = decodeTransferCallData(
                                executeData.decodedCallData[i],
                            ).args
                            toAddress = executeData.toAddress[i]
                        } catch (error) {
                            // noop
                        }
                    }
                } else {
                    ;[fromAddress, recipient, tokenId] = decodeTransferCallData(
                        executeData.decodedCallData,
                    ).args
                    toAddress = executeData.toAddress
                }

                if (
                    fromAddress === undefined ||
                    recipient === undefined ||
                    tokenId === undefined ||
                    toAddress === undefined
                ) {
                    break
                }
                return {
                    toAddress,
                    value: summedValue,
                    functionHash,
                    functionData: {
                        fromAddress: fromAddress,
                        recipient: recipient,
                        tokenId: tokenId.toString(),
                    },
                } satisfies TransferTokensData
            }
            case 'transferEth': {
                if (executeData.type !== 'single') {
                    for (let i = 0; i < executeData.decodedCallData.length; i++) {
                        const callData = executeData.decodedCallData[i]
                        const toAddress = executeData.toAddress[i]
                        if (callData === '0x') {
                            return {
                                toAddress,
                                value: summedValue,
                                functionHash,
                            } satisfies TransferEthData
                        }
                    }
                    break
                } else {
                    return {
                        toAddress: executeData.toAddress,
                        functionHash,
                        value: summedValue,
                    } satisfies TransferEthData
                }
            }
            case 'withdraw': {
                let recipient: Address | undefined
                let toAddress: Address | undefined
                if (executeData.type !== 'single') {
                    for (let i = 0; i < executeData.decodedCallData.length; i++) {
                        try {
                            recipient = decodeWithdraw(executeData.decodedCallData[i])[0]
                            toAddress = executeData.toAddress[i]
                        } catch (error) {
                            // noop
                        }
                    }
                } else {
                    recipient = decodeWithdraw(executeData.decodedCallData)[0]
                    toAddress = executeData.toAddress
                }
                if (recipient === undefined || toAddress === undefined) {
                    break
                }
                return {
                    toAddress,
                    value: summedValue,
                    functionHash,
                    functionData: {
                        recipient,
                    },
                } satisfies WithdrawData
            }
            default: {
                return data
            }
        }
    } catch (error) {
        console.error('decodeCallData::error', error)
    }

    return data
}

function decodePrepayMembership(_c: Hex) {
    const { args } = decodeFunctionData({
        // PrepayFacet.abi
        // defining the abi instead of passing around SpaceDapp/Space
        // alternative is to import @river-build/generated, but this is just simple and easy for now
        abi: [
            {
                type: 'function',
                name: 'prepayMembership',
                inputs: [
                    {
                        name: 'supply',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ],
                outputs: [],
                stateMutability: 'payable',
            },
        ],
        data: _c,
    })
    return args
}

function decodeWithdraw(_c: Hex) {
    const { args } = decodeFunctionData({
        // MembershipFacet.abi
        abi: [
            {
                type: 'function',
                name: 'withdraw',
                inputs: [
                    {
                        name: 'account',
                        type: 'address',
                        internalType: 'address',
                    },
                ],
                outputs: [],
                stateMutability: 'nonpayable',
            },
        ],
        data: _c,
    })
    return args
}

export function isPrepayMembershipData(data: unknown): data is PrepayMembershipData {
    if (typeof data !== 'object' || data === null) {
        return false
    }
    return (
        'functionHash' in data &&
        data.functionHash === 'prepayMembership' &&
        'functionData' in data &&
        typeof data.functionData === 'object' &&
        data.functionData !== null &&
        'supply' in data.functionData &&
        'toAddress' in data &&
        'value' in data
    )
}

export function isTransferEthData(data: unknown): data is TransferEthData {
    if (typeof data !== 'object' || data === null) {
        return false
    }
    return (
        'functionHash' in data &&
        data.functionHash === 'transferEth' &&
        'toAddress' in data &&
        'value' in data
    )
}

export function isTransferTokensData(data: unknown): data is TransferTokensData {
    if (typeof data !== 'object' || data === null) {
        return false
    }
    return (
        'functionHash' in data &&
        data.functionHash === 'transferTokens' &&
        'functionData' in data &&
        typeof data.functionData === 'object' &&
        data.functionData !== null &&
        'fromAddress' in data.functionData &&
        'recipient' in data.functionData &&
        'tokenId' in data.functionData &&
        'toAddress' in data &&
        'value' in data
    )
}

export function isWithdrawData(data: unknown): data is WithdrawData {
    if (typeof data !== 'object' || data === null) {
        return false
    }
    return (
        'functionHash' in data &&
        data.functionHash === 'withdraw' &&
        'functionData' in data &&
        typeof data.functionData === 'object' &&
        data.functionData !== null &&
        'recipient' in data.functionData
    )
}

export function isBatchData(
    decodedCallData: DecodedCallData<FunctionHash> | undefined,
): decodedCallData is DecodedBatchCallData<FunctionHash> {
    return (
        decodedCallData?.executeType === 'batch' &&
        decodedCallData?.toAddress !== undefined &&
        decodedCallData?.executeData !== undefined
    )
}

export function isSingleData(
    decodedCallData: DecodedCallData<FunctionHash> | undefined,
): decodedCallData is DecodedSingleCallData<FunctionHash> {
    return (
        decodedCallData?.executeType === 'single' &&
        decodedCallData?.toAddress !== undefined &&
        decodedCallData?.executeData !== undefined
    )
}
