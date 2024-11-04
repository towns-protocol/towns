import { ContractTransaction, ethers } from 'ethers'
import { ISendUserOperationResponse, IUserOperation } from 'userop'
import { Address, Space } from '@river-build/web3'
import { FunctionHash } from './types'
import { decodeTransferCallData } from './generateTransferCallData'
import { BigNumber, BytesLike } from 'ethers'
import { TownsSimpleAccount } from './TownsSimpleAccount'

export function isUserOpResponse(
    tx: undefined | ContractTransaction | ISendUserOperationResponse,
): tx is ISendUserOperationResponse {
    return typeof tx === 'object' && tx !== null && 'userOpHash' in tx && 'wait' in tx
}

export function getTransactionHashOrUserOpHash(
    tx: undefined | ContractTransaction | ISendUserOperationResponse,
): Address | undefined {
    if (!tx) {
        return
    }
    if (isUserOpResponse(tx)) {
        return tx.userOpHash as Address
    }
    return tx.hash as Address
}

/**
 * In the case of a user op, wait for the user op to be sent and return the correct transaction hash that a provider can wait for
 */
export async function getTransactionHashFromTransactionOrUserOp(
    tx: undefined | ContractTransaction | ISendUserOperationResponse,
) {
    if (isUserOpResponse(tx)) {
        const response = await tx.wait()
        return response?.transactionHash
    }
    return tx?.hash
}

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'

/**
 * should return a matching functionHash for paymaster proxy validation
 * TODO: proxy still uses function name, not sigHash
 */
export function getFunctionSigHash<ContractInterface extends ethers.utils.Interface>(
    _contractInterface: ContractInterface,
    functionHash: FunctionHash,
) {
    return functionHash
    // TODO: swap to this
    // const frag = contractInterface.getFunction(functionName)
    // return frag.format() // format sigHash
}

export function isUsingAlchemyBundler(bundlerUrl: string) {
    return bundlerUrl.includes('alchemy')
}

export const OpToJSON = (op: IUserOperation): IUserOperation => {
    return Object.keys(op)
        .map((key) => {
            let val = op[key as unknown as keyof IUserOperation]
            if (typeof val !== 'string' || !val.startsWith('0x')) {
                val = ethers.utils.hexValue(val)
            }
            return [key, val]
        })
        .reduce(
            (set, [k, v]) => ({
                ...set,
                [k]: v,
            }),
            {},
        ) as IUserOperation
}

export function decodeCallData<F extends FunctionHash>(args: {
    callData: BytesLike
    space?: Space | undefined
    functionHash: F | undefined
    builder: TownsSimpleAccount
}) {
    const { callData, space, functionHash, builder } = args
    let data
    try {
        switch (functionHash) {
            case 'prepayMembership': {
                if (!space) {
                    break
                }
                const [, , dataBytes] = builder.decodeExecute(callData)
                const decoded = space.Prepay.decodeFunctionData('prepayMembership', dataBytes)

                const supply = decoded[0]
                if (supply === undefined) {
                    break
                }

                data = {
                    supply: BigNumber.from(supply).toBigInt(),
                }
                break
            }
            case 'transferTokens': {
                const [, , dataBytes] = builder.decodeExecute(callData)
                const [fromAddress, recipient, tokenId] = decodeTransferCallData(dataBytes)

                if (!fromAddress || !recipient || !tokenId) {
                    break
                }
                data = {
                    fromAddress: fromAddress as Address,
                    recipient: recipient as Address,
                    tokenId: tokenId.toString(),
                }
                break
            }
            case 'transferEth': {
                const [to] = builder.decodeExecute(callData)

                if (!to) {
                    break
                }
                data = {
                    recipient: to as Address,
                }
                break
            }
            case 'withdraw': {
                if (!space) {
                    break
                }
                const [, , dataBytes] = builder.decodeExecute(callData)
                const [to] = space.Membership.decodeFunctionData('withdraw', dataBytes)
                if (!to) {
                    break
                }
                data = {
                    recipient: to as Address,
                }
                break
            }
            default: {
                break
            }
        }
    } catch (error) {
        console.error('decodeCallData::error', error)
    }

    return {
        type: functionHash,
        data,
    }
}
