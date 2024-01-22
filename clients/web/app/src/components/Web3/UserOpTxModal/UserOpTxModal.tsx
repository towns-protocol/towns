import React from 'react'
import { userOpsStore } from '@towns/userops'
import { formatEther } from 'viem'
import { BigNumber } from 'ethers'
import { useBalance } from 'wagmi'
import { Box, Button, Heading, Icon, IconButton, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { formatEthDisplay } from '../utils'
import { CopyWalletAddressButton } from '../TokenVerification/Buttons'

export function UserOpTxModal({ additionalWei }: { additionalWei?: bigint }) {
    const { currOpGas, confirm, deny, smartAccountAddress } = userOpsStore()
    const gasPrice = currOpGas?.maxFeePerGas ?? 0.0
    const gasLimit = currOpGas?.callGasLimit ?? 0.0
    const preverificationGas = currOpGas?.preverificationGas ?? 0.0
    // const verificationGasLimit = currOpGas?.verificationGasLimit ?? 0.0

    const txCost = BigNumber.from(gasLimit)
        .mul(BigNumber.from(gasPrice))
        .add(BigNumber.from(preverificationGas))
        .add(BigNumber.from(additionalWei ?? 0))

    const ethPrice = formatEther(txCost.toBigInt())
    const ethPriceFixed = parseFloat(ethPrice).toFixed(5)
    const displayTotalEthPrice = ethPriceFixed === '0.00000' ? '< 0.00001' : ethPriceFixed

    const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
        cacheTime: 15_000,
        staleTime: 10_000,
    })
    const formattedBalance =
        formatEthDisplay(Number.parseFloat(balanceData?.formatted ?? '0')) +
        ' ' +
        (balanceData?.symbol ? balanceData.symbol : '')

    const balanceIsLessThanCost = balanceData && balanceData.value < txCost.toBigInt()

    return (
        <>
            <IconButton padding="xs" alignSelf="end" icon="close" onClick={deny} />
            <Box gap centerContent width="400">
                <Box paddingBottom="sm">
                    <Text strong size="lg">
                        Confirm Transaction
                    </Text>
                </Box>
                <Heading level={2}>{displayTotalEthPrice + ' ETH'}</Heading>
                <Box padding background="level3" rounded="sm" width="100%" gap="md" color="default">
                    <Box horizontal width="100%" justifyContent="spaceBetween">
                        <Text>
                            Gas{' '}
                            <Text color="gray2" as="span" display="inline">
                                (estimated)
                            </Text>
                        </Text>
                        <Text> {ethPrice + ' ETH'}</Text>
                    </Box>
                    <Box
                        horizontal
                        paddingTop="md"
                        borderTop="level4"
                        width="100%"
                        justifyContent="spaceBetween"
                    >
                        <Text strong>Total</Text>
                        <Text strong> {ethPrice + ' ETH'}</Text>
                    </Box>
                </Box>
                <Box color="default" background="level3" rounded="sm" width="100%" gap="md">
                    <Box horizontal padding justifyContent="spaceBetween" alignItems="center">
                        <Box horizontal gap="sm">
                            <Box position="relative" width="x3">
                                <Icon position="absoluteCenter" type="wallet" />{' '}
                            </Box>
                            <Text>
                                {isLoadingBalance
                                    ? 'Fetching balance...'
                                    : smartAccountAddress
                                    ? shortAddress(smartAccountAddress)
                                    : 'asdff'}
                            </Text>
                        </Box>
                        {formattedBalance ? (
                            <Text color={balanceIsLessThanCost ? 'error' : 'default'}>
                                {formattedBalance} Available
                            </Text>
                        ) : (
                            <ButtonSpinner />
                        )}
                    </Box>
                </Box>
                {balanceData ? (
                    balanceIsLessThanCost ? (
                        <>
                            <Text color="error" size="sm">
                                Wallet has insufficient funds for this transaction
                            </Text>
                            <CopyWalletAddressButton
                                text="Copy Wallet Address"
                                address={smartAccountAddress}
                            />
                        </>
                    ) : (
                        <Button tone="cta1" width="100%" onClick={confirm}>
                            Confirm
                        </Button>
                    )
                ) : (
                    <Box centerContent height="x4" width="100%" />
                )}
            </Box>
        </>
    )
}
