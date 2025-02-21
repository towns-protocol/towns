import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TSigner, TransactionStatus, useConnectivity } from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Box, FancyButton, Stack, Text } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { WalletReady } from 'privy/WalletReady'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { TradingChart } from '@components/TradingChart/TradingChart'
import { isTradingChain, tradingChains } from './tradingConstants'
import { BigIntInput } from './ui/BigIntInput'
import { QuoteCard } from './ui/QuoteCard'
import { RadioButton } from './ui/RadioButton'
import { ButtonSelection } from './ui/SelectButton'
import { TabPanel } from './ui/TabPanel'
import { useBalanceOnChain } from './useBalanceOnChain'
import { useLifiQuote } from './useLifiQuote'
import { useSolanaBalance } from './useSolanaBalance'
import { useSolanaWallet } from './useSolanaWallet'
import { SolanaTransactionRequest, useTradingContext } from './TradingContextProvider'
import { useTokenBalance } from './useTokenBalance'

export const TradingPanel = () => {
    const tradingContext = useTradingContext()
    const [searchParams, setSearchParams] = useSearchParams()
    const { mode, tokenAddress, chainId } = Object.fromEntries(searchParams.entries())

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

    const { data: toTokenData } = useCoinData({
        address: toTokenAddress,
        chain: chainId,
    })

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
                { label: '2.0', value: 2 },
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

    const buyButtonPressed = useCallback(
        async (getSigner: () => Promise<TSigner | undefined>) => {
            const signer = await getSigner()
            if (
                chainId !== '8453' ||
                !signer ||
                !quote.data ||
                !quote.data.transactionRequest.to ||
                !quote.data.transactionRequest.value
            ) {
                return
            }
            tradingContext.sendEvmTransaction(
                {
                    id: quote.data.id,
                    token: {
                        name: coinData?.token.name ?? '',
                        symbol: coinData?.token.symbol ?? '',
                        address: tokenAddress ?? '',
                        amount: BigInt(quote.data.estimate.fromAmount),
                        decimals: coinData?.token.decimals ?? 0,
                    },
                    approvalAddress: quote.data.estimate.approvalAddress,
                    transaction: {
                        toAddress: quote.data.transactionRequest.to,
                        callData: quote.data.transactionRequest.data,
                        fromAmount: quote.data.estimate.fromAmount,
                        fromTokenAddress: fromTokenAddress,
                        value: quote.data.transactionRequest.value,
                    },
                    status: TransactionStatus.Pending,
                },
                signer,
            )
        },
        [quote, chainId, tokenAddress, tradingContext, fromTokenAddress, coinData],
    )

    const solanaBuyButtonPressed = useCallback(async () => {
        if (chainId !== tradingChains['solana-mainnet'].chainId) {
            console.error("chainId doesn't match")
            return
        }
        if (!quote.data) {
            console.error('no quote data')
            return
        }

        const request: SolanaTransactionRequest = {
            id: quote.data.id,
            transactionData: quote.data.transactionRequest.data,
            token: {
                name: coinData?.token.name ?? '',
                symbol: coinData?.token.symbol ?? '',
                address: tokenAddress ?? '',
                amount: amount ?? 0n,
                decimals: coinData?.token.decimals ?? 0,
            },
            status: TransactionStatus.Pending,
        }
        tradingContext.sendSolanaTransaction(request)
    }, [quote, chainId, tradingContext, coinData, tokenAddress, amount])

    const onTabChanged = useCallback(
        (tab: string) => {
            searchParams.set('mode', tab)
            setSearchParams(searchParams, { replace: true })
        },
        [setSearchParams, searchParams],
    )

    let panelContent: React.ReactNode

    if (!isTradingChain(chainId)) {
        panelContent = (
            <Box>
                <Text color="error">
                    Supplied chain &quot;{chainId}&quot; is not a trading chain. Please use a valid
                    trading chain.
                </Text>
            </Box>
        )
    } else if ((mode !== 'buy' && mode !== 'sell') || !tokenAddress) {
        panelContent = <Text color="error">Invalid mode or token address</Text>
    } else {
        panelContent = (
            <TabPanel
                layoutId={`tradingPanel-${tokenAddress}-${chainId}`}
                value={mode}
                tabs={[
                    { label: 'Buy', value: 'buy' },
                    { label: 'Sell', value: 'sell' },
                ]}
                onChange={onTabChanged}
            >
                <Stack paddingY gap="md">
                    <Stack gap="sm">
                        <Stack horizontal justifyContent="spaceBetween" display="flex" gap="sm">
                            <ButtonSelection
                                value={quickSelectValues.find((v) => v === preselectedOption)}
                                options={quickSelectValues}
                                renderItem={({ option, onSelect, selected }) => (
                                    <RadioButton
                                        label={option.label}
                                        selected={selected}
                                        icon={option.icon}
                                        onClick={() => onSelect(option)}
                                    />
                                )}
                                onChange={onSetPreselectedAmount}
                            />
                        </Stack>
                        <BigIntInput
                            icon={chainConfig.icon}
                            decimals={currentBalanceDecimals}
                            value={amount}
                            onChange={onCustomAmount}
                        />
                    </Stack>

                    <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                        <Text color="gray2">
                            <>
                                Balance:{' '}
                                {formatUnitsToFixedLength(
                                    currentTokenBalance,
                                    currentBalanceDecimals,
                                    5,
                                )}{' '}
                                {fromTokenData?.token.symbol ?? ''}
                            </>
                        </Text>
                    </Stack>

                    {quote.isLoading ? (
                        <Stack gap padding className={shimmerClass} rounded="sm" height="100">
                            <Stack height="x4" width="100%" />
                            <Stack height="x4" width="100%" />
                        </Stack>
                    ) : quote.isError ? (
                        <Stack
                            gap
                            padding
                            rounded="sm"
                            border="negative"
                            overflow="hidden"
                            background="negativeSubtle"
                        >
                            <Text size="sm">Error</Text>
                            <Box as="pre" fontSize="sm" wrap="wrap">
                                {quote.error?.message}
                            </Box>
                        </Stack>
                    ) : quote.data ? (
                        <Stack gap="sm">
                            <QuoteCard
                                chainConfig={chainConfig}
                                {...quote.data}
                                fromTokenAddress={fromTokenAddress}
                                toTokenAddress={toTokenAddress}
                                chainId={chainId}
                                fromTokenData={fromTokenData}
                                toTokenData={toTokenData}
                            />
                        </Stack>
                    ) : (
                        <></>
                    )}

                    {isSolana ? (
                        <SolanaBuyButton
                            mode={mode}
                            hasQuote={!!quote.data}
                            symbol={coinData?.token.symbol ?? ''}
                            onSendTransaction={solanaBuyButtonPressed}
                        />
                    ) : (
                        <EvmBuyButton
                            mode={mode}
                            hasQuote={!!quote.data}
                            onSendTransaction={buyButtonPressed}
                        />
                    )}
                </Stack>
            </TabPanel>
        )
    }

    return (
        <Panel
            padding
            label={
                <Stack horizontal gap="sm" alignItems="center">
                    <Text>Trade</Text>
                    <Text color="gray2">{coinData?.token.symbol}</Text>
                </Stack>
            }
        >
            <Box gap insetX="sm" insetTop="sm">
                <TradingChart
                    address={tokenAddress ?? ''}
                    chainId={chainId}
                    disabled={!tokenAddress}
                />
            </Box>
            {panelContent}
        </Panel>
    )
}

const SolanaBuyButton = (props: {
    mode: 'buy' | 'sell'
    hasQuote: boolean
    symbol: string
    onSendTransaction: () => void
}) => {
    const { mode, hasQuote, symbol, onSendTransaction } = props
    const context = useTradingContext()
    const { pendingSolanaTransaction } = context
    const isPending = !!pendingSolanaTransaction?.transactionData

    return (
        <FancyButton
            borderRadius="full"
            spinner={!!isPending}
            disabled={!hasQuote || isPending}
            background={hasQuote ? 'cta1' : 'level2'}
            onClick={onSendTransaction}
        >
            {mode === 'buy' ? `Buy ${symbol}` : `Sell ${symbol}`}
        </FancyButton>
    )
}

const EvmBuyButton = (props: {
    mode: 'buy' | 'sell'
    hasQuote: boolean
    onSendTransaction: (signer: () => Promise<TSigner | undefined>) => void
}) => {
    const { mode, hasQuote, onSendTransaction } = props
    const context = useTradingContext()
    const { pendingEvmTransaction } = context
    const isPending = !!pendingEvmTransaction

    return (
        <WalletReady>
            {({ getSigner }) => (
                <FancyButton
                    borderRadius="full"
                    spinner={!!isPending}
                    disabled={!hasQuote || isPending}
                    background={hasQuote ? 'cta1' : 'level2'}
                    onClick={() => {
                        return onSendTransaction(getSigner)
                    }}
                >
                    {mode === 'buy' ? 'Buy' : 'Sell'}
                </FancyButton>
            )}
        </WalletReady>
    )
}
