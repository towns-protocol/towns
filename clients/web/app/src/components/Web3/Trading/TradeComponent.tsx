import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react'
import { TSigner, TransactionStatus } from 'use-towns-client'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Box, FancyButton, IconName, Stack, Text } from '@ui'
import { WalletReady } from 'privy/WalletReady'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { FadeInBox } from '@components/Transitions'
import { NumberInputRadio } from './ui/NumberInputRadio'
import { RadioButton } from './ui/RadioButton'
import { ButtonSelection } from './ui/SelectButton'
import { TabPanel } from './ui/TabPanel'
import { useLifiQuote } from './useLifiQuote'
import {
    EvmTransactionRequest,
    SolanaTransactionRequest,
    useTradingContext,
} from './TradingContextProvider'
import { useTokenBalance } from './useTokenBalance'
import { getTokenValueData } from './hooks/getTokenValue'
import { isTradingChain, tradingChains } from './tradingConstants'
import { useSendTradeTransaction } from './hooks/useTradeQuote'
import { useTradeSettings } from './tradeSettingsStore'
import { PercentInputRadio } from './ui/PercentInputRadio'
import { useTradingWalletBalance } from './hooks/useTradingBalance'
import { QuoteMetaData, QuoteStatus } from './types'
import { TransactionTooltip } from './TransactionTooltip'

type QuickSelectOption = {
    label: string
    value: bigint
    icon?: IconName
}

type Props = {
    mode: 'buy' | 'sell'
    tokenAddress: string
    chainId: string
    onModeChanged?: (mode: 'buy' | 'sell') => void
    onQuoteStatusChanged?: (status: QuoteStatus | undefined) => void
    threadInfo: { channelId: string; messageId: string } | undefined
    resetRef?: React.RefObject<{ reset: () => void }>
}

export const TradeComponent = (props: Props) => {
    const { tokenAddress, threadInfo, onQuoteStatusChanged } = props

    const [mode, setMode] = useState<'buy' | 'sell'>(props.mode ?? 'buy')

    const onModeChanged = useCallback(
        (mode: 'buy' | 'sell') => {
            setMode(mode)
            props.onModeChanged?.(mode)
        },
        [props],
    )

    const [_amount, setAmount] = useState<bigint>()
    const [customAmount, setCustomAmount] = useState<bigint | undefined>()
    const [customPercent, setCustomPercent] = useState<bigint | undefined>()
    const [preselectedOption, setPreselectedOption] = useState<QuickSelectOption>()

    useEffect(() => {
        setMode(props.mode)
    }, [props.mode])

    // a little workaround to cover the case where old tickers were posted
    // a temp chainId for solana
    const chainId = props.chainId === '1151111081099710' ? 'solana-mainnet' : props.chainId

    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]

    const { walletBalance, walletAddress } = useTradingWalletBalance({
        chainId,
    })

    const isSolana = chainConfig.name === 'Solana'
    const nativeTokenAddress = chainConfig.nativeTokenAddress

    const tokenBalance = useTokenBalance(chainId, tokenAddress ?? '')

    const currentTokenBalance = mode === 'buy' ? walletBalance : tokenBalance

    const fromTokenAddress = mode === 'buy' ? nativeTokenAddress : tokenAddress
    const toTokenAddress = mode === 'buy' ? tokenAddress : nativeTokenAddress

    const { data: fromTokenData } = useCoinData({
        address: fromTokenAddress,
        chain: chainId,
    })

    const currentBalanceDecimals =
        mode === 'buy' ? chainConfig.decimals : fromTokenData?.token.decimals ?? 18

    const amount =
        preselectedOption?.label === 'custom'
            ? mode === 'buy'
                ? customAmount
                : (currentTokenBalance * (customPercent ?? 0n)) / 100n
            : _amount

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

    const balanceIsInsufficient = useMemo(() => {
        return (amount ?? 0n) > currentTokenBalance
    }, [amount, currentTokenBalance])

    const quickSelectValues = useMemo<QuickSelectOption[]>(() => {
        if (mode === 'buy') {
            return (
                chainConfig.chainId === 'solana-mainnet'
                    ? [
                          { label: '0.25', value: 0.25 },
                          { label: '0.5', value: 0.5 },
                          { label: '1.0', value: 1 },
                          { label: 'custom', value: 0 },
                      ]
                    : [
                          { label: '0.010', value: 0.01 },
                          { label: '0.025', value: 0.025 },
                          { label: '0.050', value: 0.05 },
                          { label: 'custom', value: 0 },
                      ]
            ).map((v) => ({
                ...v,
                icon: chainConfig.icon,
                value: BigInt(v.value * 10 ** chainConfig.decimals),
            }))
        } else {
            return [
                { label: '25%', value: 25n },
                { label: '50%', value: 50n },
                { label: '100%', value: 100n },
                { label: 'custom', value: 0n },
            ].map((v) => ({
                ...v,
                icon: undefined,
                value: (currentTokenBalance * v.value) / 100n,
            }))
        }
    }, [chainConfig.chainId, chainConfig.decimals, chainConfig.icon, currentTokenBalance, mode])

    useImperativeHandle(props.resetRef, () => ({
        reset: () => {
            setPreselectedOption(undefined)
            setAmount(0n)
        },
    }))

    const onSetPreselectedAmount = useCallback((option: QuickSelectOption | undefined) => {
        setPreselectedOption(option)
        setAmount(option?.value)
    }, [])

    const onCustomAmount = useCallback(
        (value: bigint) => {
            setCustomAmount(value)
            setPreselectedOption({ label: 'custom', value, icon: undefined })
        },
        [setCustomAmount],
    )

    const onCustomPercent = useCallback((_value: number) => {
        const value = BigInt(Math.max(0, Math.min(_value || 0, 100)))
        setCustomPercent(value)
        setPreselectedOption({ label: 'custom', value, icon: undefined })
    }, [])

    const onCustomFieldSelect = useCallback(() => {
        if (preselectedOption?.label === 'custom') {
            setPreselectedOption(undefined)
        } else {
            setPreselectedOption({ label: 'custom', value: customAmount ?? 0n, icon: undefined })
        }
    }, [customAmount, preselectedOption])

    const { data: coinData } = useCoinData({
        address: tokenAddress ?? '',
        chain: chainId,
    })

    const slippage = useTradeSettings(({ slippage }) => slippage)

    const {
        data: quoteData,
        isLoading: isQuoteLoading,
        isError: isQuoteError,
        error: quoteError,
    } = useLifiQuote({
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        fromAddress: walletAddress ?? '',
        toAddress: walletAddress ?? '',
        fromAmount: amount?.toString() ?? '0',
        currentTokenBalance,
        fromChain: chainId,
        toChain: chainId,
        slippage,
    })

    const onQuoteStatusChangedRef = useRef(onQuoteStatusChanged)
    onQuoteStatusChangedRef.current = onQuoteStatusChanged

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
                walletAddress: walletAddress ?? '',
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
        walletAddress,
    ])

    const { sendTradeTransaction } = useSendTradeTransaction({
        request: request,
        chainId: chainId,
        skipPendingToast: true,
    })

    const metaData = useMemo((): QuoteMetaData | undefined => {
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

        const valueAt =
            mode === 'buy'
                ? getTokenValueData({
                      amount: quoteData.estimate.fromAmount ?? '0',
                      tokenAddress: fromTokenAddress,
                      chainConfig,
                      tokenData: coinData,
                  })
                : getTokenValueData({
                      amount: quoteData.estimate.toAmount ?? '0',
                      tokenAddress: toTokenAddress,
                      chainConfig,
                      tokenData: coinData,
                  })
        return {
            mode,
            symbol: coinData?.token.symbol ?? '',
            value,
            valueAt,
        } satisfies QuoteMetaData
    }, [quoteData, mode, toTokenAddress, chainConfig, coinData, fromTokenAddress])

    useEffect(() => {
        if (isQuoteError) {
            popupToast(({ toast }) => (
                <StandardToast.Error
                    message="Error getting quote"
                    subMessage={quoteError?.message}
                    toast={toast}
                />
            ))
            onQuoteStatusChangedRef.current?.({ status: 'error', mode })
        } else if (isQuoteLoading) {
            onQuoteStatusChangedRef.current?.({ status: 'loading', mode })
        } else if (request && metaData) {
            onQuoteStatusChangedRef.current?.({
                status: 'ready',
                mode,
                data: {
                    request: request,
                    metaData: metaData,
                },
            })
        } else {
            onQuoteStatusChangedRef.current?.(undefined)
        }
    }, [isQuoteError, isQuoteLoading, metaData, mode, quoteError?.message, request])

    const selectFn = useCallback((v1: QuickSelectOption | undefined, v2: QuickSelectOption) => {
        return v1?.label === v2.label
    }, [])

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
                    { label: 'Sell', value: 'sell', disabled: tokenBalance === 0n },
                ]}
                onChange={onModeChanged}
            >
                <Stack paddingTop="md" gap="md">
                    <Stack gap="sm">
                        <Stack horizontal justifyContent="spaceBetween" display="flex" gap="sm">
                            <ButtonSelection
                                value={quickSelectValues.find((option) =>
                                    selectFn(preselectedOption, option),
                                )}
                                options={quickSelectValues}
                                selectFn={selectFn}
                                renderItem={({ option, onSelect, selected }) =>
                                    option.label === 'custom' ? (
                                        <Box
                                            grow
                                            flexBasis="none"
                                            key={option.label}
                                            cursor="pointer"
                                            borderRadius="full"
                                            color={mode === 'buy' ? 'positive' : 'peach'}
                                            style={{
                                                border: '1px solid',
                                                borderColor: selected ? 'inherit' : 'transparent',
                                            }}
                                            onClick={onCustomFieldSelect}
                                        >
                                            {mode === 'buy' ? (
                                                <NumberInputRadio
                                                    icon={chainConfig.icon}
                                                    decimals={currentBalanceDecimals}
                                                    value={customAmount}
                                                    placeholder="Custom"
                                                    color="positive"
                                                    onChange={onCustomAmount}
                                                />
                                            ) : (
                                                <PercentInputRadio
                                                    color="peach"
                                                    onChange={onCustomPercent}
                                                />
                                            )}
                                        </Box>
                                    ) : (
                                        <RadioButton
                                            key={option.label}
                                            label={option.label}
                                            color={mode === 'buy' ? 'positive' : 'peach'}
                                            selected={selected}
                                            icon={option.icon}
                                            onClick={() => onSelect(option)}
                                        />
                                    )
                                }
                                onChange={onSetPreselectedAmount}
                            />
                        </Stack>
                        {balanceIsInsufficient && (
                            <FadeInBox color="error">Insufficient balance</FadeInBox>
                        )}

                        {/* if there's no threadInfo, we're inside the global trade panel,
                            show buy/sell button */}
                        {!threadInfo && (
                            <BuySellButton
                                mode={mode}
                                chainId={chainId}
                                metaData={metaData}
                                isQuoteLoading={isQuoteLoading}
                                onPressTrade={sendTradeTransaction}
                            />
                        )}
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

const BuySellButton = (props: {
    onPressTrade:
        | undefined
        | ((getSigner: (() => Promise<TSigner | undefined>) | undefined) => Promise<void>)
    mode: 'buy' | 'sell'
    metaData: QuoteMetaData | undefined
    isQuoteLoading: boolean
    chainId: string
}) => {
    const tradingContext = useTradingContext()
    const { onPressTrade, mode, chainId, metaData, isQuoteLoading: isLoadingQuote } = props
    const isSolana = chainId === 'solana-mainnet'
    const isTransacting = isSolana
        ? tradingContext.pendingSolanaTransaction !== undefined
        : tradingContext.pendingEvmTransaction !== undefined

    const slippage = useTradeSettings(({ slippage }) => slippage)

    const tooltip = metaData ? (
        <TransactionTooltip
            mode={mode}
            chainId={chainId}
            tradeData={metaData}
            slippage={slippage}
        />
    ) : undefined

    return (
        <Box tooltip={tooltip} color="inverted">
            <WalletReady>
                {({ getSigner }) => (
                    <FancyButton
                        layoutRoot
                        compact="x4"
                        gap="xxs"
                        paddingLeft="sm"
                        paddingRight="md"
                        background={mode === 'buy' ? 'positive' : 'peach'}
                        borderRadius="full"
                        icon="lightning"
                        iconSize="square_sm"
                        style={{ opacity: isTransacting || !onPressTrade ? 0.33 : 1 }}
                        disabled={isTransacting || !onPressTrade}
                        spinner={isLoadingQuote || isTransacting}
                        onClick={() => onPressTrade?.(getSigner)}
                    >
                        {mode === 'buy' ? 'Buy' : 'Sell'}
                    </FancyButton>
                )}
            </WalletReady>
        </Box>
    )
}
