import React, { useMemo, useState } from 'react'
import { userOpsStore } from '@towns/userops'
import { BigNumber, utils } from 'ethers'

import { BASE_SEPOLIA } from 'use-towns-client'
import { useShallow } from 'zustand/react/shallow'
import { Box, Button, Heading, Icon, IconButton, Paragraph, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { isTouch, useDevice } from 'hooks/useDevice'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { useBalance } from 'hooks/useBalance'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { formatEthDisplay } from '../utils'
import { CopyWalletAddressButton } from '../TokenVerification/Buttons'
import { useWalletPrefix } from '../useWalletPrefix'

type Props = {
    valueLabel?: string
}

export function UserOpTxModal(props: Props) {
    const { currOpGas, deny } = userOpsStore()
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { isTouch } = useDevice()

    if (!currOpGas) {
        return null
    }
    return (
        <AboveAppProgressModalContainer
            asSheet={isTouch}
            minWidth="auto"
            background={isTouch ? undefined : 'none'}
            onHide={() => {
                endPublicPageLoginFlow()
                deny?.()
            }}
        >
            <UserOpTxModalContent {...props} endPublicPageLoginFlow={endPublicPageLoginFlow} />
        </AboveAppProgressModalContainer>
    )
}

function UserOpTxModalContent({
    valueLabel,
    endPublicPageLoginFlow,
}: Props & { endPublicPageLoginFlow: () => void }) {
    const { currOpGas, currOpValue, confirm, deny, smartAccountAddress, retryType } = userOpsStore(
        useShallow((s) => ({
            currOpGas: s.currOpGas,
            confirm: s.confirm,
            deny: s.deny,
            smartAccountAddress: s.smartAccountAddress,
            retryType: s.retryType,
            currOpValue: s.currOpValue,
        })),
    )

    const { baseChainConfig } = useEnvironment()
    const walletPrefix = useWalletPrefix()

    const {
        data: isSmartAccountDeployed,
        isLoading: isSmartAccountDeployedLoading,
        error: isSmartAccountDeployedError,
    } = useIsSmartAccountDeployed()

    const gasPrice = currOpGas?.maxFeePerGas ?? 0.0
    const gasLimit = currOpGas?.callGasLimit ?? 0.0
    const preverificationGas = currOpGas?.preverificationGas ?? 0.0

    const gasCost = BigNumber.from(gasLimit)
        .mul(BigNumber.from(gasPrice))
        .add(BigNumber.from(preverificationGas))

    const totalCost = gasCost.add(BigNumber.from(currOpValue ?? 0))

    const gasInEth = utils.formatEther(gasCost)
    const gasInEthFixedTo8 = parseFloat(gasInEth).toFixed(8)
    const membershipInEth = currOpValue ? utils.formatEther(currOpValue) : undefined
    const totalInEth = utils.formatEther(totalCost.toBigInt())
    const totalInEthFixedTo5 = parseFloat(totalInEth).toFixed(5)
    const totalInEthFixedTo8 = parseFloat(totalInEth).toFixed(8)
    const displayTotalEthPrice = totalInEthFixedTo5 === '0.00000' ? '< 0.00001' : totalInEthFixedTo5
    const [showWalletWarning, setShowWalletWarning] = useState(false)

    const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
    })
    const formattedBalance =
        formatEthDisplay(Number.parseFloat(balanceData?.formatted ?? '0')) +
        ' ' +
        (balanceData?.symbol ? balanceData.symbol : '')

    const balanceIsLessThanCost = balanceData && balanceData.value < totalCost.toBigInt()
    const _isTouch = isTouch()

    const walletCopyText = useMemo(
        () => `${walletPrefix}:${smartAccountAddress}`,
        [smartAccountAddress, walletPrefix],
    )

    const bridgeLink =
        baseChainConfig.chainId === BASE_SEPOLIA
            ? 'https://sepolia-bridge.base.org/deposit'
            : 'https://bridge.base.org/deposit'

    const onCopyClick = () => {
        setShowWalletWarning(true)
    }

    const bottomContent = () => {
        if (!balanceData) {
            return <Box centerContent height="x4" width="100%" />
        }

        if (isSmartAccountDeployedLoading) {
            return <ButtonSpinner />
        }

        // Temporary, to be refactored w/ credit card integration
        // https://linear.app/hnt-labs/issue/HNT-5529/revisit-the-smart-account-not-deployed-guard-in-useroptxmodal
        if (isSmartAccountDeployedError || !isSmartAccountDeployed) {
            return (
                <>
                    <Text color="error" size="sm">
                        Smart wallet is not yet deployed.
                    </Text>
                </>
            )
        }

        if (balanceIsLessThanCost) {
            return (
                <>
                    <Text color="error" size="sm">
                        You need to transfer ETH on Base to your towns wallet{' '}
                        <Box
                            as="a"
                            display="inline"
                            cursor="pointer"
                            href={bridgeLink}
                            color="default"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            here
                        </Box>
                        .
                    </Text>

                    <CopyWalletAddressButton
                        text="Copy Wallet Address"
                        address={walletCopyText}
                        onClick={onCopyClick}
                    />

                    {showWalletWarning && (
                        <Box centerContent padding horizontal gap rounded="sm" background="level3">
                            <Icon shrink={false} type="alert" />
                            <Paragraph>
                                Important! Only transfer assets on {walletPrefix} to your Towns
                                wallet.
                            </Paragraph>
                        </Box>
                    )}
                </>
            )
        }
        return (
            <Button tone="cta1" width="100%" onClick={confirm}>
                Confirm
            </Button>
        )
    }

    return (
        <>
            <IconButton
                padding="xs"
                alignSelf="end"
                icon="close"
                onClick={() => {
                    endPublicPageLoginFlow()
                    deny()
                }}
            />
            <Box gap centerContent width={!_isTouch ? '400' : undefined} maxWidth="400">
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
                        <Text> {gasInEthFixedTo8 + ' ETH'}</Text>
                    </Box>
                    {/* {isLoadingMembershipPrice ? <ButtonSpinner /> : null} */}
                    {currOpValue ? (
                        <Box
                            horizontal={!_isTouch}
                            gap={_isTouch ? 'sm' : undefined}
                            width="100%"
                            justifyContent="spaceBetween"
                        >
                            <Text>{valueLabel} </Text>
                            <Text> {membershipInEth + ' ETH'}</Text>
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
                        <Text strong> {totalInEthFixedTo8 + ' ETH'}</Text>
                    </Box>
                </Box>
                <Box
                    color="default"
                    background="level3"
                    rounded="sm"
                    width="100%"
                    gap="md"
                    border={balanceIsLessThanCost ? 'negative' : 'none'}
                >
                    <Box padding horizontal justifyContent="spaceBetween" alignItems="center">
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
                            <Text>{formattedBalance} Available</Text>
                        ) : (
                            <ButtonSpinner />
                        )}
                    </Box>
                </Box>
                {retryType === 'preVerification' && (
                    <Box
                        horizontal
                        padding
                        gap
                        centerContent
                        rounded="sm"
                        background="level2"
                        width="100%"
                    >
                        <Icon type="alert" color="error" />
                        <Text color="error">
                            Preverification gas was too low. Would you like to try this transaction
                            again?
                        </Text>
                    </Box>
                )}

                {bottomContent()}
            </Box>
        </>
    )
}
