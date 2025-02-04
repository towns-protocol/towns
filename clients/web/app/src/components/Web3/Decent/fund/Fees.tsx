import React, { useMemo } from 'react'
import { useEstimateFeesPerGas } from 'wagmi'
import { MotionIcon, Stack, Text } from '@ui'
import { Accordion } from 'ui/components/Accordion/Accordion'
import { formatUnits, formatUnitsToFixedLength } from 'hooks/useBalance'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Section } from './Section'
import { calculateUsdAmountFromEth, formatUsd } from '../../useEthPrice'
import { useFundContext } from './FundContext'

export function Fees() {
    const { isEstimatedGasLoading, isBoxActionLoading, tokenPriceInUsd } = useFundContext()
    const { fees, total, isLoadingGasFees } = useFees()
    const isGasLoading = isEstimatedGasLoading || isLoadingGasFees
    const isLoading = isBoxActionLoading || isGasLoading

    const totalFeesUsd = calculateUsdAmountFromEth({
        ethAmount: total,
        ethPriceInUsd: tokenPriceInUsd?.decimalFormat,
    })

    return (
        <Section>
            <Accordion
                header={({ isExpanded }) => (
                    <AccordionHeader
                        isExpanded={isExpanded}
                        isLoading={isLoading}
                        feesUsd={formatUsd(formatUnits(totalFeesUsd ?? 0n))}
                    />
                )}
                background="none"
                padding="none"
            >
                <Stack paddingY gap="md">
                    <FeeLineItem
                        isLoading={isBoxActionLoading}
                        title="Protocol fee"
                        value={fees.protocolFee.formatted}
                    />
                    <FeeLineItem
                        isLoading={isBoxActionLoading}
                        title="Bridge fee"
                        value={fees.bridgeFee.formatted}
                    />
                    <FeeLineItem
                        isLoading={isGasLoading}
                        title="Gas fee"
                        value={fees.gasFee.formatted}
                    />
                </Stack>
            </Accordion>
        </Section>
    )
}

function FeeLineItem({
    title,
    value,
    isLoading,
}: {
    title: string
    value: string
    isLoading: boolean
}) {
    return (
        <Stack horizontal justifyContent="spaceBetween" alignItems="center" height="x2">
            <Text color="gray2">{title}</Text>
            {isLoading ? <ButtonSpinner color="gray2" width="x1" /> : <Text>{value}</Text>}
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
    const { boxActionResponse, estimatedGas, srcToken } = useFundContext()
    const { data: estimatedGasFees, isLoading: isEstimatedGasFeesLoading } = useEstimateFeesPerGas({
        chainId: srcToken?.chainId,
    })

    return useMemo(() => {
        const { protocolFee, bridgeFee } = boxActionResponse ?? {}
        const maxFeePerGas = estimatedGasFees?.maxFeePerGas

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
                raw: estimatedGas && maxFeePerGas ? estimatedGas * maxFeePerGas : 0n,
                formatted:
                    estimatedGas && maxFeePerGas
                        ? `${formatUnitsToFixedLength(estimatedGas * maxFeePerGas)} ${
                              srcToken?.symbol
                          }`
                        : '0',
            },
        }

        const total = fees.protocolFee.raw + fees.bridgeFee.raw + fees.gasFee.raw

        return { fees, total, isLoadingGasFees: isEstimatedGasFeesLoading }
    }, [
        boxActionResponse,
        estimatedGasFees?.maxFeePerGas,
        estimatedGas,
        srcToken?.symbol,
        isEstimatedGasFeesLoading,
    ])
}
