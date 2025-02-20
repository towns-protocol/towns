import { BigNumberish, BigNumber, BytesLike, utils } from 'ethers'
import { Address, Space } from '@river-build/web3'
import { FunctionHash } from '../types'
import { decodeTransferCallData } from './generateTransferCallData'
import { TownsSimpleAccount } from '../lib/useropjs/TownsSimpleAccount'

type SingleExecuteData = {
    type: 'single'
    toAddress: Address
    value: BigNumberish
    decodedCallData: BytesLike
}

type BatchExecuteData = {
    type: 'batch'
    toAddress: Address[]
    decodedCallData: BytesLike[]
    value?: never
}

type ExecuteData = SingleExecuteData | BatchExecuteData

type DecodedSingleCallData<F extends FunctionHash> = {
    toAddress: Address
    value: BigNumberish | undefined
    executeData: BytesLike
    functionHash: F | undefined
    functionData?: unknown
    executeType: 'single'
}

type DecodedBatchCallData<F extends FunctionHash> = {
    toAddress: Address[]
    executeData: BytesLike[]
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
    executeData: BytesLike
    executeType: 'single'
}

export function decodeCallData<F extends FunctionHash>(args: {
    callData: BytesLike
    space?: Space | undefined
    functionHash: F | undefined
    builder: TownsSimpleAccount
}) {
    const { callData, space, functionHash, builder } = args

    let executeData: ExecuteData
    try {
        const [_toAddress, _value, _dataBytes] = builder.decodeExecute(callData)
        executeData = {
            type: 'single',
            toAddress: _toAddress as Address,
            value: _value as BigNumberish,
            decodedCallData: _dataBytes as BytesLike,
        }
    } catch (error) {
        try {
            const [_toAddress, _dataBytes] = builder.decodeExecuteBatch(callData)
            executeData = {
                type: 'batch',
                toAddress: _toAddress as Address[],
                decodedCallData: _dataBytes as BytesLike[],
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
                    utils.hexlify(executeData.decodedCallData),
                )

                if (!fromAddress || !recipient || !tokenId) {
                    break
                }
                return {
                    ...data,
                    functionData: {
                        fromAddress: fromAddress as Address,
                        recipient: recipient as Address,
                        tokenId: BigNumber.from(tokenId).toString(),
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
