import { UseBoxActionArgs } from '@decent.xyz/box-hooks'
import { BoxActionResponse, EvmTransaction } from '@decent.xyz/box-common'
import { Address, EstimateGasParameters } from 'viem'

export function isActionConfig(config: unknown): config is UseBoxActionArgs {
    return (
        typeof config === 'object' &&
        config !== null &&
        'sender' in config &&
        typeof config.sender === 'string' &&
        'srcToken' in config &&
        typeof config.srcToken === 'string' &&
        'dstToken' in config &&
        typeof config.dstToken === 'string' &&
        'srcChainId' in config &&
        typeof config.srcChainId === 'number' &&
        'dstChainId' in config &&
        typeof config.dstChainId === 'number' &&
        'slippage' in config &&
        typeof config.slippage === 'number' &&
        'actionType' in config &&
        typeof config.actionType === 'string' &&
        'actionConfig' in config &&
        typeof config.actionConfig === 'object' &&
        config.actionConfig !== null &&
        'amount' in config.actionConfig &&
        typeof config.actionConfig.amount === 'bigint' &&
        'swapDirection' in config.actionConfig &&
        typeof config.actionConfig.swapDirection === 'string' &&
        'receiverAddress' in config.actionConfig &&
        typeof config.actionConfig.receiverAddress === 'string' &&
        'chainId' in config.actionConfig &&
        typeof config.actionConfig.chainId === 'number'
    )
}

export function estimateGasArgs(args: {
    sender: Address | undefined
    boxActionResponse: BoxActionResponse | undefined
}) {
    const { sender, boxActionResponse } = args
    return {
        account: sender,
        ...(boxActionResponse?.tx as EvmTransaction),
    } as unknown as EstimateGasParameters
}

export function isBoxActionResponseError(
    boxActionResponse: BoxActionResponse | BoxActionResponseError | undefined,
): boxActionResponse is BoxActionResponseError {
    if (!boxActionResponse) {
        return false
    }
    return 'error' in boxActionResponse
}

// undocumented and incorrectly typed response from a box action
// can sometimes return this response. try swapping 999 ETH and you get this
type BoxActionResponseError = {
    error: unknown
    success: false
}
