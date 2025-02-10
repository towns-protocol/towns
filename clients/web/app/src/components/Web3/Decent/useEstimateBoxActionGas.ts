import { Address } from 'viem'

import { BoxActionResponse } from '@decent.xyz/box-common'
import { useEstimateGas } from 'wagmi'
import { useMemo } from 'react'
import { estimateGasArgs, isBoxActionResponseError } from './utils'

export function useEstimateBoxActionGas(args: {
    sender: Address | undefined
    boxActionResponse: BoxActionResponse | undefined
    amount: bigint | undefined
    enabled?: boolean
}) {
    const { sender, boxActionResponse, amount, enabled = true } = args

    const _estimateGasArgs = estimateGasArgs({ sender, tx: boxActionResponse?.tx })

    const enableQuery = useMemo(() => {
        if (
            !sender ||
            !amount ||
            !boxActionResponse ||
            isBoxActionResponseError(boxActionResponse)
        ) {
            return false
        }
        return true
    }, [sender, amount, boxActionResponse])

    return useEstimateGas({
        ..._estimateGasArgs,
        query: {
            // this still runs even if i set to false??
            enabled: enableQuery && enabled,
            retryDelay: 1_000,
        },
    })
}
