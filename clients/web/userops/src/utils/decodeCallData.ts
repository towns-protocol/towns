import { BytesLike, BigNumberish, utils, BigNumber } from 'ethers'
import { Address, Space } from '@river-build/web3'
import { FunctionHash } from '../types'
import { decodeTransferCallData } from './generateTransferCallData'
import { Hex, isHex } from 'viem'
import { decodeExecuteAbi, decodeExecuteBatchAbi } from '../lib/permissionless/accounts/simple/abi'

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
    value?: never
}

type ExecuteData = SingleExecuteData | BatchExecuteData

type DecodedSingleCallData<F extends FunctionHash> = {
    toAddress: Address
    value: bigint | undefined
    executeData: Hex
    functionHash: F | undefined
    functionData?: unknown
    executeType: 'single'
}

type DecodedBatchCallData<F extends FunctionHash> = {
    toAddress: Address[]
    executeData: Hex[]
    value?: never
    functionHash: F | undefined
    functionData?: unknown
    executeType: 'batch'
}

type DecodedCallData<F extends FunctionHash> = DecodedSingleCallData<F> | DecodedBatchCallData<F>

type PrepayMembershipData = DecodedCallData<'prepayMembership'> & {
    functionData: {
        supply: bigint
    }
}

type TransferTokensData = DecodedCallData<'transferTokens'> & {
    functionData: {
        fromAddress: Address
        recipient: Address
        tokenId: string
    }
}

type WithdrawData = DecodedCallData<'withdraw'> & {
    functionData: {
        recipient: Address
    }
}

type TransferEthData = Omit<DecodedCallData<'transferEth'>, 'toAddress' | 'executeData'> & {
    toAddress: Address
    executeData: Hex
    executeType: 'single'
}

export function decodeCallData<F extends FunctionHash>(args: {
    callData: BytesLike
    space?: Space | undefined
    functionHash: F | undefined
}) {
    const { callData, space, functionHash } = args

    let executeData: ExecuteData
    try {
        if (typeof callData === 'string') {
            if (!isHex(callData)) {
                throw new Error('callData is not a valid hex string')
            }
            const [_toAddress, _value, _dataBytes] = decodeExecuteAbi(callData).args
            executeData = {
                type: 'single',
                toAddress: _toAddress,
                value: _value,
                decodedCallData: _dataBytes,
            }
        } else {
            const ethersCallData = utils.hexlify(callData)
            if (!isHex(ethersCallData)) {
                throw new Error('callData is not a valid hex string')
            }
            const [_toAddress, _value, _dataBytes] = decodeExecuteAbi(ethersCallData).args
            executeData = {
                type: 'single',
                toAddress: _toAddress,
                value: _value,
                decodedCallData: _dataBytes,
            }
        }
    } catch (error) {
        try {
            const ethersCallData = utils.hexlify(callData)
            if (!isHex(ethersCallData)) {
                throw new Error('callData is not a valid hex string')
            }
            const [_toAddress, _dataBytes] = decodeExecuteBatchAbi(ethersCallData).args
            executeData = {
                type: 'batch',
                toAddress: _toAddress as Address[],
                decodedCallData: _dataBytes as Hex[],
            }
        } catch (error) {
            throw new Error('failed to decode call data')
        }
    }

    let data: DecodedCallData<F>

    if (executeData.type === 'single') {
        data = {
            toAddress: executeData.toAddress,
            value: executeData.value,
            executeData: executeData.decodedCallData,
            functionHash,
            executeType: 'single',
        }
    } else if (executeData.type === 'batch') {
        data = {
            toAddress: executeData.toAddress,
            executeData: executeData.decodedCallData,
            functionHash,
            value: undefined,
            executeType: 'batch',
        }
    } else {
        throw new Error('failed to decode call data')
    }

    try {
        switch (functionHash) {
            case 'prepayMembership': {
                if (!space) {
                    break
                }
                if (executeData.type !== 'single') {
                    break
                }

                const decoded = space.Prepay.decodeFunctionData(
                    'prepayMembership',
                    executeData.decodedCallData,
                )

                const supply = decoded[0] as BigNumberish
                if (supply === undefined) {
                    break
                }

                return {
                    ...data,
                    functionData: {
                        supply: BigNumber.from(supply).toBigInt(),
                    },
                } as PrepayMembershipData
            }
            case 'transferTokens': {
                if (executeData.type !== 'single') {
                    break
                }

                const [fromAddress, recipient, tokenId] = decodeTransferCallData(
                    executeData.decodedCallData,
                ).args

                if (!fromAddress || !recipient || !tokenId) {
                    break
                }
                return {
                    ...data,
                    functionData: {
                        fromAddress: fromAddress,
                        recipient: recipient,
                        tokenId: tokenId.toString(),
                    },
                } as TransferTokensData
            }
            case 'transferEth': {
                if (executeData.type !== 'single') {
                    break
                }
                return data as TransferEthData
            }
            case 'withdraw': {
                if (!space) {
                    break
                }
                if (executeData.type !== 'single') {
                    break
                }
                const [to] = space.Membership.decodeFunctionData(
                    'withdraw',
                    executeData.decodedCallData,
                )
                if (!to) {
                    break
                }
                return {
                    ...data,
                    functionData: {
                        recipient: to as Address,
                    },
                } as WithdrawData
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

export function isPrepayMembershipData(
    decodedCallData: DecodedCallData<FunctionHash> | undefined,
): decodedCallData is PrepayMembershipData {
    return (
        decodedCallData?.functionHash === 'prepayMembership' &&
        !!decodedCallData?.functionData &&
        typeof decodedCallData.functionData === 'object' &&
        'supply' in decodedCallData.functionData
    )
}

export function isTransferEthData(
    decodedCallData: DecodedCallData<FunctionHash> | undefined,
): decodedCallData is TransferEthData {
    return (
        decodedCallData?.functionHash === 'transferEth' &&
        !!decodedCallData?.functionData &&
        typeof decodedCallData.functionData === 'object' &&
        'toAddress' in decodedCallData.functionData &&
        'executeData' in decodedCallData &&
        'executeType' in decodedCallData
    )
}

export function isTransferTokensData(
    decodedCallData: DecodedCallData<FunctionHash> | undefined,
): decodedCallData is TransferTokensData {
    return (
        decodedCallData?.functionHash === 'transferTokens' &&
        !!decodedCallData?.functionData &&
        typeof decodedCallData.functionData === 'object' &&
        'fromAddress' in decodedCallData.functionData &&
        'recipient' in decodedCallData.functionData &&
        'tokenId' in decodedCallData.functionData
    )
}

export function isWithdrawData(
    decodedCallData: DecodedCallData<FunctionHash> | undefined,
): decodedCallData is WithdrawData {
    return (
        decodedCallData?.functionHash === 'withdraw' &&
        !!decodedCallData?.functionData &&
        typeof decodedCallData.functionData === 'object' &&
        'recipient' in decodedCallData.functionData
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
