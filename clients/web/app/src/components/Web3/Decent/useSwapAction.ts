import {
    ActionType,
    BoxActionResponse,
    ChainId,
    EvmTransaction,
    SwapActionConfig,
    SwapDirection,
    TokenInfo,
} from '@decent.xyz/box-common'
import { UseBoxActionArgs, useBoxAction } from '@decent.xyz/box-hooks'
import { getAccount, getPublicClient, sendTransaction, switchChain } from '@wagmi/core'
import { useEffect, useMemo, useState } from 'react'
import { Address } from 'viem'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { wagmiConfig } from 'wagmiConfig'
import { estimateGasArgs, isActionConfig } from './utils'
import { checkForApproval } from './checkForApproval'

type UseSwapActionArgs = {
    sender: UseBoxActionArgs['sender'] | undefined
    srcToken: TokenInfo | undefined
    dstToken: TokenInfo | undefined
    amount: SwapActionConfig['amount'] | undefined
}

const nonConfigurableConfig = {
    slippage: 1, // defaults to 1
    actionType: ActionType.SwapAction,
    swapDirection: SwapDirection.EXACT_AMOUNT_IN,
}

export function useSwapAction(args: UseSwapActionArgs) {
    const { sender, srcToken, dstToken, amount } = args
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data

    // there is a weird bug w/ this hook where even though the arguments can be either undefined or UseBoxActionArgs according to typescript,
    // it throws an error internally if you switch from undefined to UseBoxActionArgs
    // so whereas i'd like to pass either undefined or { ...config }
    // i'm passing the config with fallback values AND making sure enable is only true if all args are defined
    const config: UseBoxActionArgs = {
        sender: sender ?? '',
        srcToken: srcToken?.address ?? '',
        dstToken: dstToken?.address ?? '',
        srcChainId: srcToken?.chainId ?? ChainId.ETHEREUM,
        dstChainId: dstToken?.chainId ?? ChainId.BASE,
        slippage: nonConfigurableConfig.slippage,
        actionType: nonConfigurableConfig.actionType,
        actionConfig: {
            amount: amount ?? 0n,
            swapDirection: nonConfigurableConfig.swapDirection,
            receiverAddress: myAbstractAccountAddress,
            chainId: dstToken?.chainId ?? ChainId.BASE,
        },
    }

    const { actionResponse, isLoading, error } = useBoxAction({
        ...config,
        enable: isActionConfig(config),
    })

    return useMemo(() => {
        return {
            actionResponse,
            isLoading,
            error,
        }
    }, [actionResponse, isLoading, error])
}

export async function sendSwapTransaction(args: {
    srcChainId: number | undefined
    tx: BoxActionResponse['tx']
}) {
    const { srcChainId, tx } = args
    try {
        const account = getAccount(wagmiConfig)
        const publicClient = getPublicClient(wagmiConfig)
        if (!account || !srcChainId) {
            return
        }
        if (account.chainId !== srcChainId) {
            await switchChain(wagmiConfig, { chainId: srcChainId })
        }
        const gas = await publicClient?.estimateGas(
            estimateGasArgs({ sender: account.address, tx }),
        )
        return sendTransaction(wagmiConfig, {
            ...(tx as EvmTransaction),
            gas,
        })
    } catch (e) {
        console.error('[sendSwapTransaction] error', e)
    }
}

export function useSwapWithApproval(args: UseSwapActionArgs & { approvedAt: Date | undefined }) {
    const { sender, srcToken, dstToken, amount, approvedAt } = args
    const [isApprovalRequired, setIsApprovalRequired] = useState(false)
    const { actionResponse, isLoading, error } = useSwapAction({
        sender,
        srcToken,
        dstToken,
        amount,
    })

    useEffect(() => {
        async function init() {
            if (!actionResponse || !sender || !srcToken?.chainId) {
                setIsApprovalRequired(false)
                return
            }
            console.log('[useSwapWithApproval] checking for approval', {
                ...srcToken,
                amount: actionResponse?.tokenPayment?.amount,
            })
            const isApprovalRequired = await checkForApproval({
                userAddress: sender as Address,
                actionResponse,
                srcChainId: srcToken?.chainId,
            })
            setIsApprovalRequired(!!isApprovalRequired)
        }

        init()
    }, [actionResponse, srcToken, sender, approvedAt])

    return {
        actionResponse,
        isApprovalRequired,
        isLoading,
        error,
    }
}
