import React from 'react'
import { Box, Heading, Text } from '@ui'
import { useValueLabel } from './hooks/useValueLabel'

export function ChargesSummary(props: {
    gasInEth: string
    currOpValueInEth: string | undefined
    totalInEth: string
    balanceIsLessThanCost: boolean
}) {
    const { gasInEth, currOpValueInEth, totalInEth, balanceIsLessThanCost } = props
    const valueLabel = useValueLabel()

    return (
        <>
            <Box paddingBottom="sm">
                <Text strong size="lg">
                    Confirm Payment
                </Text>
            </Box>
            <Heading level={balanceIsLessThanCost ? 3 : 2}>{totalInEth + ' ETH'}</Heading>
            <Box padding background="level3" rounded="sm" width="100%" gap="md" color="default">
                <Box horizontal width="100%" justifyContent="spaceBetween">
                    <Text>
                        Gas{' '}
                        <Text color="gray2" as="span" display="inline">
                            (estimated)
                        </Text>
                    </Text>
                    <Text> {gasInEth + ' ETH'}</Text>
                </Box>
                {currOpValueInEth ? (
                    <Box horizontal width="100%" justifyContent="spaceBetween">
                        <Text>{valueLabel} </Text>
                        <Text> {currOpValueInEth + ' ETH'}</Text>
                    </Box>
                ) : null}

                <Box
                    horizontal
                    paddingTop="md"
                    borderTop="level4"
                    width="100%"
                    justifyContent="spaceBetween"
                >
                    <Text strong>Total</Text>
                    <Text strong> {totalInEth + ' ETH'}</Text>
                </Box>
            </Box>
        </>
    )
}
