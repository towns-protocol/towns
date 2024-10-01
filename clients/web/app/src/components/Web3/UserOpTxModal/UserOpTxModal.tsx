import { userOpsStore } from '@towns/userops'
import { BigNumber } from 'ethers'
import React, { useMemo, useState } from 'react'
import { Address, useConnectivity } from 'use-towns-client'
import { useShallow } from 'zustand/react/shallow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { Box, Button, Heading, Icon, IconButton, Paragraph, Text } from '@ui'
import { BRIDGE_LEARN_MORE_LINK } from 'data/links'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { formatUnitsToFixedLength, useBalance } from 'hooks/useBalance'
import { isTouch, useDevice } from 'hooks/useDevice'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { CopyWalletAddressButton } from '../GatedTownModal/Buttons'
import { useWalletPrefix } from '../useWalletPrefix'

type Props = {
    valueLabel?: string
    requiresBalanceGreaterThanCost?: boolean
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
    requiresBalanceGreaterThanCost,
    endPublicPageLoginFlow,
}: Props & { endPublicPageLoginFlow: () => void }) {
    const _requiresBalanceGreaterThanCost = requiresBalanceGreaterThanCost ?? true
    const { currOpGas, currOpValue, confirm, deny, retryDetails } = userOpsStore(
        useShallow((s) => ({
            currOpGas: s.currOpGas,
            confirm: s.confirm,
            deny: s.deny,
            retryDetails: s.retryDetails,
            currOpValue: s.currOpValue,
        })),
    )
    const { loggedInWalletAddress } = useConnectivity()

    const { data: smartAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress as Address,
    })

    const walletPrefix = useWalletPrefix()

    const { isLoading: isSmartAccountDeployedLoading } = useIsSmartAccountDeployed()

    const gasPrice = currOpGas?.maxFeePerGas ?? 0.0
    const gasLimit = currOpGas?.callGasLimit ?? 0.0
    const verificationGasLimit = currOpGas?.verificationGasLimit ?? 0.0
    const preverificationGas = currOpGas?.preverificationGas ?? 0.0

    const sumGas = BigNumber.from(gasLimit)
        .add(BigNumber.from(preverificationGas))
        .add(BigNumber.from(verificationGasLimit))

    const gasCost = sumGas.mul(BigNumber.from(gasPrice))

    const totalCost = gasCost.add(BigNumber.from(currOpValue ?? 0))

    const gasInEth = formatUnitsToFixedLength(gasCost.toBigInt())
    const currOpValueInEth = currOpValue
        ? formatUnitsToFixedLength(BigNumber.from(currOpValue).toBigInt())
        : undefined
    const [showWalletWarning, setShowWalletWarning] = useState(false)

    const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
        fixedLength: 18,
    })
    const balanceIsLessThanCost =
        _requiresBalanceGreaterThanCost && balanceData && balanceData.value < totalCost.toBigInt()

    const formattedBalance = `${
        (balanceIsLessThanCost
            ? balanceData?.formatted ?? 0
            : formatUnitsToFixedLength(balanceData?.value ?? 0n, 18, 5)) ?? 0
    } ${balanceData?.symbol ?? ''}`

    const totalInEth = formatUnitsToFixedLength(
        totalCost.toBigInt(),
        18,
        balanceIsLessThanCost ? 18 : 5,
    )

    const _isTouch = isTouch()

    const walletCopyText = useMemo(
        () => `${walletPrefix}:${smartAccountAddress}`,
        [smartAccountAddress, walletPrefix],
    )

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

        if (balanceIsLessThanCost) {
            return (
                <>
                    <Text size="sm" color="error">
                        You need to bridge ETH on Base and then transfer to your towns wallet.{' '}
                        <Box
                            as="a"
                            gap="xs"
                            href={BRIDGE_LEARN_MORE_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={atoms({ color: 'default', display: 'inline' })}
                        >
                            Learn how
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
                    {/* {isLoadingMembershipPrice ? <ButtonSpinner /> : null} */}
                    {currOpValue ? (
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
                                    : ''}
                            </Text>
                        </Box>
                        {formattedBalance ? (
                            <Text size={balanceIsLessThanCost ? 'sm' : 'md'}>
                                {formattedBalance} Available
                            </Text>
                        ) : (
                            <ButtonSpinner />
                        )}
                    </Box>
                </Box>
                {retryDetails?.type === 'gasTooLow' && (
                    <Box
                        horizontal
                        padding
                        gap
                        centerContent
                        rounded="sm"
                        background="level2"
                        width="100%"
                    >
                        <Icon type="alert" color="error" shrink={false} />
                        <Text color="error">
                            Estimated gas was too low{' '}
                            {typeof retryDetails?.data === 'string'
                                ? `for ${retryDetails.data}`
                                : ''}
                            . Would you like to try this transaction again?
                        </Text>
                    </Box>
                )}

                {bottomContent()}
            </Box>
        </>
    )
}
