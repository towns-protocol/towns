import React, { createContext, useContext, useMemo, useState } from 'react'
import { BoxActionResponse, ChainId, TokenInfo, getNativeTokenInfo } from '@decent.xyz/box-common'
import { Address } from 'viem'
import { useAccount, useEstimateGas } from 'wagmi'
import { create } from 'zustand'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useSwapWithApproval } from '@components/Web3/Decent/useSwapAction'
import { useEstimateBoxActionGas } from '@components/Web3/Decent/useEstimateBoxActionGas'
import { useActiveWalletIsPrivy, useIsWagmiConnected } from '../useActiveWalletIsPrivy'
import { useNonPrivyWallets } from '../SelectDifferentWallet'
import { waitForReceipt } from '../waitForReceipt'

export type Transaction = {
    receipt?: Awaited<ReturnType<typeof waitForReceipt>>
    status: 'pending' | 'success' | 'error' | undefined
    error?: Error
}

type FundState = {
    sender: Address | undefined
    srcToken: TokenInfo | undefined
    dstToken: TokenInfo | undefined
    approvedAt: Date | undefined
    isApprovalRequired: boolean
    amount: bigint | undefined
    estimatedGas: bigint | undefined
    estimatedGasFailureReason: ReturnType<typeof useEstimateGas>['failureReason']
    isEstimatedGasLoading: boolean
    boxActionError: unknown
    isBoxActionLoading: boolean
    boxActionResponse: BoxActionResponse | undefined
    disabled: boolean
    tx: Transaction
}

type FundActions = {
    setSrcToken: (token: TokenInfo) => void
    setApprovedAt: (approved: Date) => void
    setAmount: (amount: bigint) => void
    setTx: (tx: Transaction) => void
}

export const FundContext = createContext<(FundState & FundActions) | undefined>(undefined)

export const FundProvider = ({ children }: { children: React.ReactNode }) => {
    const { baseChain } = useEnvironment()
    const isBaseMainnet = baseChain.id === ChainId.BASE
    const srcChain = isBaseMainnet ? ChainId.ETHEREUM : ChainId.BASE_SEPOLIA
    const dstChain = isBaseMainnet ? ChainId.BASE : ChainId.BASE_SEPOLIA
    const { address: sender } = useAccount()
    const [srcToken, setSrcToken] = useState<TokenInfo | undefined>(
        getNativeTokenInfo(srcChain) as TokenInfo,
    )
    const dstToken = useMemo(() => getNativeTokenInfo(dstChain) ?? undefined, [dstChain])
    const [amount, setAmount] = useState<bigint | undefined>(undefined)
    const [approvedAt, setApprovedAt] = useState<Date | undefined>(undefined)
    const [tx, setTx] = useState<Transaction>({
        status: undefined,
    })

    // const { data: tokenPriceInUsd } = useDecentUsdConversion(srcToken)

    const isWagmiConnected = useIsWagmiConnected()
    const nonPrivyWallets = useNonPrivyWallets()
    const activeWalletIsPrivy = useActiveWalletIsPrivy()
    const disabled =
        !isWagmiConnected ||
        nonPrivyWallets.length === 0 ||
        activeWalletIsPrivy ||
        tx.status === 'pending'

    const {
        actionResponse: boxActionResponse,
        isLoading: isBoxActionLoading,
        error: boxActionError,
        isApprovalRequired,
    } = useSwapWithApproval({
        sender,
        srcToken,
        dstToken,
        amount,
        approvedAt,
    })

    const {
        data: estimatedGas,
        isLoading: isEstimatedGasLoading,
        failureReason: estimatedGasFailureReason,
    } = useEstimateBoxActionGas({
        sender,
        boxActionResponse,
        amount,
        enabled: !isApprovalRequired,
    })

    // see ActionButton.tsx for why we don't need this
    // useEffect(() => {
    //     useFundTxStore.setState(tx)
    // }, [tx])

    return (
        <FundContext.Provider
            value={{
                sender,
                srcToken,
                dstToken,
                amount,
                estimatedGas,
                isEstimatedGasLoading,
                isBoxActionLoading,
                boxActionError,
                boxActionResponse,
                estimatedGasFailureReason,
                tx,
                disabled,
                isApprovalRequired,
                approvedAt,
                setTx,
                setSrcToken,
                setAmount,
                setApprovedAt,
            }}
        >
            {children}
        </FundContext.Provider>
    )
}

export const useFundContext = () => {
    const context = useContext(FundContext)
    if (!context) {
        throw new Error('useFundContext must be used within a FundProvider')
    }
    return context
}

// stupid workaround for react-hot-toast not being wrapped in context provider
export const useFundTxStore = create<Transaction>()(() => ({
    status: undefined,
    setTx: (state: Transaction, tx: Transaction) => ({
        ...state,
        ...tx,
    }),
}))
