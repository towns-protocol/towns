import React, { createContext, useContext, useMemo, useState } from 'react'
import { BoxActionResponse, ChainId, TokenInfo, getNativeTokenInfo } from '@decent.xyz/box-common'
import { Address } from 'viem'
import { useAccount, useEstimateGas } from 'wagmi'
import { create } from 'zustand'
import { calculateUsdAmountFromEth, formatUsd } from '@components/Web3/useEthPrice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useDecentUsdConversion } from '@components/Web3/Decent/useDecentUsdConversion'
import { useSwapAction } from '@components/Web3/Decent/useSwapAction'
import { useEstimateBoxActionGas } from '@components/Web3/Decent/useEstimateBoxActionGas'
import { formatUnits } from 'hooks/useBalance'
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
    amount: bigint | undefined
    estimatedGas: bigint | undefined
    tokenPriceInUsd: ReturnType<typeof useDecentUsdConversion>['data']
    estimatedGasFailureReason: ReturnType<typeof useEstimateGas>['failureReason']
    isEstimatedGasLoading: boolean
    boxActionError: unknown
    isBoxActionLoading: boolean
    boxActionResponse: BoxActionResponse | undefined
    usdAmount: string
    disabled: boolean
    tx: Transaction
}

type FundActions = {
    setSrcToken: (token: TokenInfo) => void
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
    const [tx, setTx] = useState<Transaction>({
        status: undefined,
    })
    const { data: tokenPriceInUsd } = useDecentUsdConversion(srcToken)
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
    } = useSwapAction({
        sender,
        srcToken,
        dstToken,
        amount,
    })

    const {
        data: estimatedGas,
        isLoading: isEstimatedGasLoading,
        failureReason: estimatedGasFailureReason,
    } = useEstimateBoxActionGas({
        sender,
        boxActionResponse,
        amount,
    })

    const usdAmount = formatUsd(
        formatUnits(
            calculateUsdAmountFromEth({
                ethAmount: amount,
                ethPriceInUsd: tokenPriceInUsd?.decimalFormat,
            }) || 0n,
            srcToken?.decimals,
        ),
    )

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
                tokenPriceInUsd,
                isEstimatedGasLoading,
                isBoxActionLoading,
                boxActionError,
                boxActionResponse,
                estimatedGasFailureReason,
                usdAmount,
                tx,
                disabled,
                setTx,
                setSrcToken,
                setAmount,
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
