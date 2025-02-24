import React, { useMemo } from 'react'
import { useGasPrice } from 'wagmi'
import { MotionIcon, Stack, Text } from '@ui'
import { Accordion } from 'ui/components/Accordion/Accordion'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Section } from './Section'
import { useFundContext } from './FundContext'
import { useDecentUsdConversion, useUsdOrTokenConversion } from '../useDecentUsdConversion'
export function Fees() {
    const { isEstimatedGasLoading, isBoxActionLoading, dstToken } = useFundContext()
    const { fees, total, isLoadingGasPrice } = useFees()
    const isGasLoading = isEstimatedGasLoading || isLoadingGasPrice
    const isLoading = isBoxActionLoading || isGasLoading
    const { data: dstTokenPriceInUsd } = useDecentUsdConversion(dstToken)
    const conversion = useUsdOrTokenConversion()

    const totalFees = conversion({
        tokenAmount: total,
        tokenPriceInUsd: dstTokenPriceInUsd?.quote?.formatted,
        // dstToken is always Base ETH
        // Decent's own modal always shows the gas/protocol fees in ETH
        // so using ETH as the token price in USD gives the same results
        decimals: dstToken?.decimals,
        symbol: dstToken?.symbol,
    })

    // The fees display follows Decent's modal logic, which is kind of confusing for ERC20s
    //
    // Approve the token first (b/c ERC20): https://etherscan.io/tx/0xdb2728031b5b5ab530a396e20ac81b3ba06c1ddfd9f771df56bfccf6ed485a66
    //
    // The fee here is not actually applied to this tx, b/c this tx is just an approval
    //
    // Decent's modal shows
    // Total fees: $7.13
    // Protocol fee: 0.000702
    // Bridge fee: 0.002458
    // Gas: -
    //
    // Our modal shows:
    // Total fees: $7.13
    // Protocol fee: 0.0009
    // Bridge fee: 0.00255
    // Gas: -
    //
    // Then swap: https://etherscan.io/tx/0xe7368ee48a6fe0121282eed96a2767b250898df360b8cb1d35dac68eaa389ac3
    // The total fees in this tx are $7.13 + the gas cost, so the modal always displays the protocol/bridge fees, but that only applies when tx is actually a swap
    //
    // These values don't apply directly to this tx b/c I wanted to record the values here, but similar
    //
    // Decent's modal shows
    // Total fees: $10.96
    // Protocol fee: 0.000702
    // Bridge fee: 0.002458
    // Gas: 0.001412
    //
    // Our modal shows:
    // Total fees: $10.29
    // Protocol fee: 0.0009
    // Bridge fee: 0.00255
    // Gas: 0.001188

    return (
        <Section>
            <Accordion
                header={({ isExpanded }) => (
                    <AccordionHeader
                        isExpanded={isExpanded}
                        isLoading={isLoading}
                        feesUsd={totalFees ?? ''}
                    />
                )}
                background="none"
                padding="none"
            >
                <Stack paddingY gap="md">
                    <FeeLineItem
                        isLoading={isBoxActionLoading}
                        title="Protocol fee"
                        fee={fees.protocolFee}
                    />
                    <FeeLineItem
                        isLoading={isBoxActionLoading}
                        title="Bridge fee"
                        fee={fees.bridgeFee}
                    />
                    <FeeLineItem isLoading={isGasLoading} title="Gas fee" fee={fees.gasFee} />
                </Stack>
            </Accordion>
        </Section>
    )
}

function FeeLineItem({
    title,
    isLoading,
    fee,
}: {
    title: string
    isLoading: boolean
    fee: { raw: bigint; formatted: string }
}) {
    return (
        <Stack horizontal justifyContent="spaceBetween" alignItems="center" height="x2">
            <Text color="gray2">{title}</Text>
            {isLoading ? (
                <ButtonSpinner color="gray2" width="x1" />
            ) : (
                <Text>{fee.raw ? fee.formatted : '-'}</Text>
            )}
        </Stack>
    )
}

function AccordionHeader({
    isExpanded,
    feesUsd,
    isLoading,
}: {
    isExpanded: boolean
    feesUsd: string
    isLoading: boolean
}) {
    return (
        <Stack horizontal justifyContent="spaceBetween" alignItems="center" gap="sm">
            <Stack grow>
                <Text>Fees</Text>
            </Stack>
            {isLoading ? (
                <ButtonSpinner color="gray2" width="x1" />
            ) : (
                <Stack color="gray2">{feesUsd}</Stack>
            )}
            <MotionIcon
                animate={{
                    rotate: isExpanded ? '-180deg' : '0deg',
                }}
                size="square_xs"
                initial={{ rotate: '-180deg' }}
                transition={{ duration: 0.2 }}
                type="arrowDown"
            />
        </Stack>
    )
}

export function useFees() {
    const { boxActionResponse, estimatedGas, dstToken } = useFundContext()
    const { data: gasPrice, isLoading: isLoadingGasPrice } = useGasPrice()

    return useMemo(() => {
        const { protocolFee, bridgeFee } = boxActionResponse ?? {}

        const fees = {
            protocolFee: {
                raw: protocolFee?.amount ?? 0n,
                formatted: protocolFee
                    ? `${formatUnitsToFixedLength(protocolFee.amount, protocolFee.decimals)} ${
                          protocolFee.symbol
                      }`
                    : '0',
            },
            bridgeFee: {
                raw: bridgeFee?.amount ?? 0n,
                formatted: bridgeFee
                    ? `${formatUnitsToFixedLength(bridgeFee.amount, bridgeFee.decimals)} ${
                          bridgeFee.symbol
                      }`
                    : '0',
            },
            gasFee: {
                raw: estimatedGas && gasPrice ? estimatedGas * gasPrice : 0n,
                formatted:
                    estimatedGas && gasPrice
                        ? `${formatUnitsToFixedLength(estimatedGas * gasPrice)} ${dstToken?.symbol}`
                        : '0',
            },
        }

        const total = fees.protocolFee.raw + fees.bridgeFee.raw + fees.gasFee.raw

        return { fees, total, isLoadingGasPrice }
    }, [boxActionResponse, estimatedGas, gasPrice, dstToken?.symbol, isLoadingGasPrice])
}
