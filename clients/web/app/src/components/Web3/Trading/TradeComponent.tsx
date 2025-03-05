import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TransactionStatus, useConnectivity } from 'use-towns-client'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Box, Stack, Text } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { BigIntInput } from './ui/BigIntInput'
import { RadioButton } from './ui/RadioButton'
import { ButtonSelection } from './ui/SelectButton'
import { TabPanel } from './ui/TabPanel'
import { useBalanceOnChain } from './useBalanceOnChain'
import { useLifiQuote } from './useLifiQuote'
import { useSolanaBalance } from './useSolanaBalance'
import { useSolanaWallet } from './useSolanaWallet'
import { EvmTransactionRequest, SolanaTransactionRequest } from './TradingContextProvider'
import { useTokenBalance } from './useTokenBalance'
import { getTokenValueData } from './hooks/getTokenValue'
import { isTradingChain, tradingChains } from './tradingConstants'

// const DISPLAY_QUOTE = false

type Props = {
    mode: 'buy' | 'sell'
    tokenAddress: string
    chainId: string
    onModeChanged?: (mode: 'buy' | 'sell') => void
    onQuoteChanged?: (
        request: EvmTransactionRequest | SolanaTransactionRequest | undefined,
        metaData: QuoteMetaData | undefined,
    ) => void
    threadInfo: { channelId: string; messageId: string } | undefined
}

export type QuoteMetaData = {
    mode: 'buy' | 'sell'
    symbol: string
    value: ReturnType<typeof getTokenValueData>
}

export const TradeComponent = (props: Props) => {
    const { tokenAddress, threadInfo, onQuoteChanged } = props

    const [mode, setMode] = useState<'buy' | 'sell'>(props.mode ?? 'buy')

    const onModeChanged = useCallback(
        (mode: 'buy' | 'sell') => {
            setMode(mode)
            props.onModeChanged?.(mode)
        },
        [props],
    )

    useEffect(() => {
        setMode(props.mode)
    }, [props.mode])

    // a little workaround to cover the case where old tickers were posted
    // a temp chainId for solana
    const chainId = props.chainId === '1151111081099710' ? 'solana-mainnet' : props.chainId

    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]

    const { loggedInWalletAddress } = useConnectivity()

    const { data: evmWalletAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { data: ethBalance } = useBalanceOnChain(evmWalletAddress, 8453)
    const { solanaWallet } = useSolanaWallet()
    const { data: solanaBalance } = useSolanaBalance(solanaWallet?.address)
    const { nativeTokenAddress } = chainConfig

    const isSolana = chainConfig.name === 'Solana'
    const address = isSolana ? solanaWallet?.address : evmWalletAddress
    const tokenBalance = useTokenBalance(chainId, tokenAddress ?? '')
    const currentTokenBalance =
        mode === 'buy' ? (isSolana ? solanaBalance : ethBalance) : tokenBalance
    const fromTokenAddress = mode === 'buy' ? nativeTokenAddress : tokenAddress
    const toTokenAddress = mode === 'buy' ? tokenAddress : nativeTokenAddress

    const { data: fromTokenData } = useCoinData({
        address: fromTokenAddress,
        chain: chainId,
    })

    // const { data: toTokenData } = useCoinData({
    //     address: toTokenAddress,
    //     chain: chainId,
    // })

    const currentBalanceDecimals =
        mode === 'buy' ? chainConfig.decimals : fromTokenData?.token.decimals ?? 18
    const [amount, setAmount] = useState<bigint>()

    const cachedAmounts = useRef<Record<string, bigint | undefined>>({})

    const key = `${mode}-${tokenAddress}-${chainId}`
    const prevKey = useRef(key)

    useEffect(() => {
        if (prevKey.current !== key) {
            prevKey.current = key
            setAmount(cachedAmounts.current[key] ?? 0n)
        }
        cachedAmounts.current[key] = amount
    }, [amount, key])

    const quickSelectValues = useMemo(() => {
        if (mode === 'buy') {
            return [
                { label: '0.25', value: 0.25 },
                { label: '0.5', value: 0.5 },
                { label: '1.0', value: 1 },
                { label: 'custom', value: 2 },
            ].map((v) => ({
                ...v,
                icon: chainConfig.icon,
                value: BigInt(v.value * 10 ** chainConfig.decimals),
            }))
        } else {
            return [
                { label: '25%', value: 25n },
                { label: '50%', value: 50n },
                { label: '75%', value: 75n },
                { label: '100%', value: 100n },
            ].map((v) => ({
                ...v,
                icon: undefined,
                value: (currentTokenBalance * v.value) / 100n,
            }))
        }
    }, [chainConfig.decimals, chainConfig.icon, currentTokenBalance, mode])

    const [preselectedOption, setPreselectedOption] = useState<{ label: string; value: bigint }>()

    const onSetPreselectedAmount = useCallback((option: { label: string; value: bigint }) => {
        setPreselectedOption(option)
        setAmount(option.value)
    }, [])

    const onCustomAmount = useCallback(
        (value: bigint) => {
            setAmount(value)
            setPreselectedOption(undefined)
        },
        [setAmount],
    )

    const { data: coinData } = useCoinData({
        address: tokenAddress ?? '',
        chain: chainId,
    })

    const quote = useLifiQuote({
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        fromAddress: address ?? '',
        toAddress: address ?? '',
        fromAmount: amount?.toString() ?? '0',
        currentTokenBalance,
        fromChain: chainId,
        toChain: chainId,
    })

    const { data: quoteData } = quote

    const request = useMemo(() => {
        if (!quoteData) {
            return undefined
        }

        if (isSolana) {
            return {
                id: quoteData.id,
                type: 'solana',
                transactionData: quoteData.transactionRequest.data,
                token: {
                    name: coinData?.token.name ?? '',
                    symbol: coinData?.token.symbol ?? '',
                    address: tokenAddress ?? '',
                    amount: amount ?? 0n,
                    decimals: coinData?.token.decimals ?? 0,
                },
                status: TransactionStatus.Pending,
                threadInfo: threadInfo,
                isBuy: mode === 'buy',
            } satisfies SolanaTransactionRequest
        } else {
            return {
                id: quoteData.id,
                type: 'evm',
                token: {
                    name: coinData?.token.name ?? '',
                    symbol: coinData?.token.symbol ?? '',
                    address: tokenAddress ?? '',
                    amount: BigInt(quoteData.estimate.fromAmount),
                    decimals: coinData?.token.decimals ?? 0,
                },
                approvalAddress: quoteData.estimate.approvalAddress,
                transaction: {
                    toAddress: quoteData.transactionRequest.to ?? '',
                    callData: quoteData.transactionRequest.data,
                    fromAmount: quoteData.estimate.fromAmount,
                    fromTokenAddress: fromTokenAddress,
                    value: quoteData.transactionRequest.value ?? '0',
                },
                walletAddress: address ?? '',
                status: TransactionStatus.Pending,
                threadInfo: threadInfo,
                isBuy: mode === 'buy',
            } satisfies EvmTransactionRequest
        }
    }, [
        amount,
        coinData,
        fromTokenAddress,
        isSolana,
        quoteData,
        tokenAddress,
        threadInfo,
        mode,
        address,
    ])

    const metaData = useMemo(() => {
        if (!quoteData) {
            return undefined
        }
        const value =
            mode === 'buy'
                ? getTokenValueData({
                      amount: quoteData.estimate.toAmount ?? '0',
                      tokenAddress: toTokenAddress,
                      chainConfig,
                      tokenData: coinData,
                  })
                : getTokenValueData({
                      amount: quoteData.estimate.fromAmount ?? '0',
                      tokenAddress: fromTokenAddress,
                      chainConfig,
                      tokenData: coinData,
                  })
        return {
            mode,
            symbol: coinData?.token.symbol ?? '',
            value,
        } satisfies QuoteMetaData
    }, [quoteData, mode, toTokenAddress, chainConfig, coinData, fromTokenAddress])

    useEffect(() => {
        if (request && metaData) {
            onQuoteChanged?.(request, metaData)
        }
    }, [request, metaData, onQuoteChanged])

    if (!isTradingChain(chainId)) {
        return (
            <Box>
                <Text color="error">
                    Supplied chain &quot;{chainId}&quot; is not a trading chain. Please use a valid
                    trading chain.
                </Text>
            </Box>
        )
    } else if ((mode !== 'buy' && mode !== 'sell') || !tokenAddress) {
        return <Text color="error">Invalid mode or token address</Text>
    } else {
        return (
            <TabPanel
                layoutId={`tradingPanel-${tokenAddress}-${chainId}`}
                value={mode}
                tabs={[
                    { label: 'Buy', value: 'buy' },
                    { label: 'Sell', value: 'sell' },
                ]}
                onChange={onModeChanged}
            >
                <Stack paddingTop="md" gap="md">
                    <Stack gap="sm">
                        <Stack horizontal justifyContent="spaceBetween" display="flex" gap="sm">
                            <ButtonSelection
                                value={quickSelectValues.find((v) => v === preselectedOption)}
                                options={quickSelectValues}
                                renderItem={({ option, onSelect, selected }) =>
                                    option.label === 'custom' ? (
                                        <Box grow flexBasis="none">
                                            <BigIntInput
                                                icon={chainConfig.icon}
                                                decimals={currentBalanceDecimals}
                                                value={amount}
                                                placeholder="Custom"
                                                onChange={onCustomAmount}
                                            />
                                        </Box>
                                    ) : (
                                        <RadioButton
                                            label={option.label}
                                            selected={selected}
                                            icon={option.icon}
                                            onClick={() => onSelect(option)}
                                        />
                                    )
                                }
                                onChange={onSetPreselectedAmount}
                            />
                        </Stack>
                    </Stack>

                    {/* {DISPLAY_QUOTE && (
                        <QuotePreview
                            chainConfig={chainConfig}
                            chainId={chainId}
                            fromTokenAddress={fromTokenAddress}
                            fromTokenData={fromTokenData}
                            quote={quote}
                            toTokenAddress={toTokenAddress}
                            toTokenData={toTokenData}
                        />
                    )} */}
                </Stack>
            </TabPanel>
        )
    }
}
