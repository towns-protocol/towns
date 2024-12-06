import { PaymasterErrorCode, userOpsStore } from '@towns/userops'
import { BigNumber } from 'ethers'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Address,
    useConnectivity,
    useContractSpaceInfoWithoutClient,
    useTownsClient,
} from 'use-towns-client'
import { useShallow } from 'zustand/react/shallow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { CrossmintPayment } from '@components/CrossmintPayment'
import { Box, Button, Heading, Icon, IconButton, Paragraph, Text, Tooltip } from '@ui'
import { BRIDGE_LEARN_MORE_LINK } from 'data/links'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { formatUnits, formatUnitsToFixedLength, useBalance } from 'hooks/useBalance'
import { isTouch, useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { useStore } from 'store/store'
import { Analytics } from 'hooks/useAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { PayWithCardButton } from './PayWithCardButton'
import { CopyWalletAddressButton } from '../GatedTownModal/Buttons'

export function UserOpTxModal() {
    const { currOp, confirm, deny } = userOpsStore()
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { isTouch } = useDevice()
    const [disableUiWhileCrossmintPaymentPhase, setDisableUiWhileCrossmintPaymentPhase] =
        useState(false)

    if (typeof confirm !== 'function' || !currOp) {
        return null
    }
    return (
        <AboveAppProgressModalContainer
            asSheet={isTouch}
            minWidth="auto"
            background={isTouch ? undefined : 'none'}
            onHide={() => {
                // prevent close while crossmint payment is in progress
                if (disableUiWhileCrossmintPaymentPhase) {
                    return
                }
                endPublicPageLoginFlow()
                deny?.()
            }}
        >
            <UserOpTxModalContent
                endPublicPageLoginFlow={endPublicPageLoginFlow}
                disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                setDisableUiWhileCrossmintPaymentPhase={setDisableUiWhileCrossmintPaymentPhase}
            />
        </AboveAppProgressModalContainer>
    )
}

function UserOpTxModalContent({
    endPublicPageLoginFlow,
    disableUiWhileCrossmintPaymentPhase,
    setDisableUiWhileCrossmintPaymentPhase,
}: {
    endPublicPageLoginFlow: () => void
    disableUiWhileCrossmintPaymentPhase: boolean
    setDisableUiWhileCrossmintPaymentPhase: (value: boolean) => void
}): JSX.Element {
    const [showCrossmintPayment, setShowCrossmintPayment] = useState(false)
    const [showEthPayment, setShowEthPayment] = useState(false)
    const { setRecentlyMintedSpaceToken } = useStore()

    const {
        currOp,
        currOpDecodedCallData,
        currOpValue,
        confirm,
        deny,
        retryDetails,
        rejectedSponsorshipReason,
    } = userOpsStore(
        useShallow((s) => ({
            currOp: s.currOp,
            confirm: s.confirm,
            deny: s.deny,
            retryDetails: s.retryDetails,
            currOpValue: s.currOpValue,
            currOpDecodedCallData: s.currOpDecodedCallData,
            rejectedSponsorshipReason: s.rejectedSponsorshipReason,
        })),
    )
    const chainName = useEnvironment().baseChain.name

    const isJoiningSpace = !!usePublicPageLoginFlow().spaceBeingJoined
    const { clickCopyWalletAddress, clickConfirmJoinTransaction } = useJoinFunnelAnalytics()
    const spaceId = useSpaceIdFromPathname()
    const analytics = useGatherSpaceDetailsAnalytics({
        spaceId,
    })
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)

    const onConfirm = () => {
        confirm?.()
        if (isJoiningSpace) {
            clickConfirmJoinTransaction()
        }
    }

    const rejectionMessage = useMemo(() => {
        if (rejectedSponsorshipReason === PaymasterErrorCode.PAYMASTER_LIMIT_REACHED) {
            return 'Maximum gas sponsorship reached.'
        } else if (rejectedSponsorshipReason === PaymasterErrorCode.DAILY_LIMIT_REACHED) {
            return 'Daily sponsored transactions reached.'
        }
    }, [rejectedSponsorshipReason])

    // transferEth op, user can set the max amount of eth to transfer from their towns wallet
    // in this case the gas will be substracted from their tx
    // otherwise they'd get a warning that they don't have enough eth b/c max wallet eth would be lower than eth + gas fees
    const _requiresBalanceGreaterThanCost = currOpDecodedCallData?.type !== 'transferEth'
    const valueLabel = useMemo(() => {
        if (currOpDecodedCallData?.type === 'prepayMembership' && currOpDecodedCallData.data) {
            const { supply } = currOpDecodedCallData.data
            return `Seats x ${supply}`
        } else if (
            currOpDecodedCallData?.type === 'joinSpace' ||
            currOpDecodedCallData?.type === 'joinSpace_linkWallet'
        ) {
            return 'Membership'
        }
    }, [currOpDecodedCallData])

    const toAddress = useMemo(() => {
        const type = currOpDecodedCallData?.type
        if (
            (type === 'transferEth' || type === 'transferTokens' || type === 'withdraw') &&
            currOpDecodedCallData?.data
        ) {
            return currOpDecodedCallData.data.recipient
        }
    }, [currOpDecodedCallData])

    const { loggedInWalletAddress } = useConnectivity()

    const { data: smartAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress as Address,
    })

    const { isLoading: isSmartAccountDeployedLoading } = useIsSmartAccountDeployed()

    const currOpGas = {
        maxFeePerGas: currOp?.maxFeePerGas,
        callGasLimit: currOp?.callGasLimit,
        verificationGasLimit: currOp?.verificationGasLimit,
        preVerificationGas: currOp?.preVerificationGas,
    }

    const gasPrice = currOpGas?.maxFeePerGas ?? 0.0
    const gasLimit = currOpGas?.callGasLimit ?? 0.0
    const verificationGasLimit = currOpGas?.verificationGasLimit ?? 0.0
    const preverificationGas = currOpGas?.preVerificationGas ?? 0.0

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

    const { clientSingleton, signerContext } = useTownsClient()
    const { joinAfterSuccessfulCrossmint } = usePublicPageLoginFlow()

    const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
        fixedLength: 18,
    })
    const balanceIsLessThanCost =
        _requiresBalanceGreaterThanCost && balanceData && balanceData.value < totalCost.toBigInt()

    useJoinTransactionModalShownAnalyticsEvent({
        spaceId,
        spaceName: spaceInfo?.name,
        isJoiningSpace,
        balanceIsLessThanCost: !!balanceIsLessThanCost,
    })

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

    const onCopyClick = () => {
        setShowWalletWarning(true)
        if (isJoiningSpace) {
            clickCopyWalletAddress({ spaceId, spaceName: spaceInfo?.name })
        }
    }

    const handleCrossmintPaymentStart = () => {
        setDisableUiWhileCrossmintPaymentPhase(true)
    }

    const handleCrossmintFailure = () => {
        setDisableUiWhileCrossmintPaymentPhase(false)
    }

    const handleCrossmintComplete = async () => {
        if (clientSingleton && signerContext && spaceInfo?.name) {
            await joinAfterSuccessfulCrossmint({
                clientSingleton,
                signerContext,
                analyticsData: { spaceName: spaceInfo.name },
            })
            if (spaceId) {
                setRecentlyMintedSpaceToken({
                    spaceId,
                    isOwner: false,
                })
            }
        } else {
            console.warn(
                'Unable to join after Crossmint payment:',
                clientSingleton ? null : 'clientSingleton is undefined',
                signerContext ? null : 'signerContext is undefined',
                spaceInfo?.name ? null : 'spaceInfo.name is undefined',
            )
        }
        userOpsStore.setState({ currOp: undefined, confirm: undefined, deny: undefined })
        endPublicPageLoginFlow()
        setShowCrossmintPayment(false)
    }

    const isJoinSpace =
        currOpDecodedCallData?.type === 'joinSpace' ||
        currOpDecodedCallData?.type === 'joinSpace_linkWallet'

    const handleBack = () => {
        setShowCrossmintPayment(false)
        setShowEthPayment(false)
    }

    const bottomContent = (): JSX.Element => {
        if (!balanceData) {
            return <Box centerContent height="x4" width="100%" />
        }

        if (isSmartAccountDeployedLoading) {
            return <ButtonSpinner />
        }

        if (showCrossmintPayment && spaceInfo?.address) {
            return (
                <CrossmintPayment
                    contractAddress={spaceInfo.address}
                    townWalletAddress={smartAccountAddress || ''}
                    price={formatUnits(BigInt(currOpValue?.toString() ?? 0), 18)}
                    onComplete={handleCrossmintComplete}
                    onPaymentStart={handleCrossmintPaymentStart}
                    onPaymentFailure={handleCrossmintFailure}
                />
            )
        }

        if (showEthPayment && balanceIsLessThanCost) {
            return (
                <Box paddingTop="md" gap="md" width={!_isTouch ? '400' : undefined}>
                    <Text size="sm" color="error">
                        You need to bridge ETH on Base and then transfer to your towns wallet to pay{' '}
                        with ETH.{' '}
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
                    </Text>

                    <CopyWalletAddressButton
                        text="Copy Wallet Address"
                        address={smartAccountAddress}
                        onClick={onCopyClick}
                    />

                    {showWalletWarning && (
                        <Box centerContent padding horizontal gap rounded="sm" background="level3">
                            <Icon shrink={false} type="alert" />
                            <Paragraph>
                                Important! Only transfer assets on {chainName} to your Towns wallet.
                            </Paragraph>
                        </Box>
                    )}
                </Box>
            )
        }

        return (
            <Box gap="md" width="100%" paddingTop="md">
                {isJoinSpace && spaceInfo?.address && (
                    <PayWithCardButton
                        spaceDetailsAnalytics={analytics}
                        contractAddress={spaceInfo.address}
                        onClick={() => setShowCrossmintPayment(true)}
                    />
                )}
                <Button
                    tone="level3"
                    rounded="lg"
                    onClick={() => {
                        // add analytics
                        if (balanceIsLessThanCost) {
                            setShowEthPayment(true)
                        } else {
                            Analytics.getInstance().track('clicked pay with card', {
                                spaceName: getSpaceNameFromCache(spaceId),
                                spaceId,
                                gatedSpace: analytics.gatedSpace,
                                pricingModule: analytics.pricingModule,
                                priceInWei: analytics.priceInWei,
                            })
                            onConfirm()
                        }
                    }}
                >
                    <Box
                        display="flex"
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        gap="sm"
                        style={{
                            background: 'linear-gradient(90deg, #21E078 0%, #1FDBF1 100%)',
                            textOverflow: 'clip',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        <Icon type="greenEth" />
                        Pay with ETH
                    </Box>
                </Button>
            </Box>
        )
    }

    return (
        <>
            <Box horizontal justifyContent="spaceBetween">
                {showCrossmintPayment || showEthPayment ? (
                    <PlaceholderOrIcon
                        disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                    >
                        <IconButton icon="arrowLeft" onClick={handleBack} />
                    </PlaceholderOrIcon>
                ) : (
                    <Box width="x3" />
                )}
                <PlaceholderOrIcon
                    disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                >
                    <IconButton
                        padding="xs"
                        alignSelf="end"
                        icon="close"
                        onClick={() => {
                            endPublicPageLoginFlow()
                            deny?.()
                        }}
                    />
                </PlaceholderOrIcon>
            </Box>
            {!showCrossmintPayment && (
                <Box gap centerContent width={!_isTouch ? '400' : undefined}>
                    <Box paddingBottom="sm">
                        <Text strong size="lg">
                            Confirm Payment
                        </Text>
                    </Box>
                    <Heading level={balanceIsLessThanCost ? 3 : 2}>{totalInEth + ' ETH'}</Heading>
                    <Box
                        padding
                        background="level3"
                        rounded="sm"
                        width="100%"
                        gap="md"
                        color="default"
                    >
                        <Box horizontal width="100%" justifyContent="spaceBetween">
                            <Text>
                                Gas{' '}
                                <Text color="gray2" as="span" display="inline">
                                    (estimated)
                                </Text>
                            </Text>
                            <Text> {gasInEth + ' ETH'}</Text>
                        </Box>
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

                    {showEthPayment ? (
                        <Box
                            padding
                            color="default"
                            background="level3"
                            rounded="sm"
                            width="100%"
                            gap="md"
                            border={balanceIsLessThanCost ? 'negative' : 'none'}
                        >
                            {toAddress && (
                                <Box borderBottom="level4" paddingBottom="sm">
                                    <RecipientText sendingTo={toAddress} />
                                </Box>
                            )}

                            <Box horizontal justifyContent="spaceBetween" alignItems="center">
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
                    ) : (
                        !balanceIsLessThanCost && (
                            <Box
                                padding
                                color="default"
                                background="level3"
                                rounded="sm"
                                width="100%"
                                gap="md"
                            >
                                {toAddress && (
                                    <Box borderBottom="level4" paddingBottom="sm">
                                        <RecipientText sendingTo={toAddress} />
                                    </Box>
                                )}

                                <Box horizontal justifyContent="spaceBetween" alignItems="center">
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
                                        <Text size="md">{formattedBalance} Available</Text>
                                    ) : (
                                        <ButtonSpinner />
                                    )}
                                </Box>
                            </Box>
                        )
                    )}
                    {rejectedSponsorshipReason && (
                        <Box padding horizontal gap background="level3" rounded="sm">
                            <Icon type="info" color="gray1" shrink={false} />
                            <Text>
                                Gas sponsorship is not available for this transaction.{' '}
                                {rejectionMessage}
                            </Text>
                        </Box>
                    )}
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
                </Box>
            )}
            {bottomContent()}
        </>
    )
}

export function RecipientText(props: { sendingTo: string }) {
    const { sendingTo } = props
    const [container] = useState(() => document.getElementById('above-app-progress-root'))
    if (!container) {
        return null
    }

    return (
        <Box horizontal gap="sm" alignItems="center" justifyContent="spaceBetween" width="100%">
            <Box horizontal gap="sm" alignItems="center">
                <Icon shrink={false} type="linkOutWithFrame" />
                <Text>Sending to</Text>
            </Box>
            {sendingTo && (
                <Box
                    tooltipRootLayer={container}
                    tooltip={<Tooltip zIndex="tooltipsAbove">{sendingTo}</Tooltip>}
                >
                    <ClipboardCopy
                        color="default"
                        label={shortAddress(sendingTo)}
                        clipboardContent={sendingTo}
                    />
                </Box>
            )}
        </Box>
    )
}

export function useJoinTransactionModalShownAnalyticsEvent(args: {
    spaceId: string | undefined
    spaceName: string | undefined
    isJoiningSpace: boolean
    balanceIsLessThanCost: boolean
}) {
    const { spaceId, spaceName, isJoiningSpace, balanceIsLessThanCost } = args
    const { joinTransactionModalShown } = useJoinFunnelAnalytics()
    const triggered = useRef(false)

    useEffect(() => {
        if (isJoiningSpace && !triggered.current) {
            joinTransactionModalShown({
                spaceId,
                spaceName,
                funds: balanceIsLessThanCost ? 'insufficient' : 'sufficient',
            })
            triggered.current = true
        }
    }, [spaceId, spaceName, joinTransactionModalShown, balanceIsLessThanCost, isJoiningSpace])
}

function PlaceholderOrIcon({
    disableUiWhileCrossmintPaymentPhase,
    children,
}: {
    disableUiWhileCrossmintPaymentPhase: boolean
    children: React.ReactNode
}) {
    if (disableUiWhileCrossmintPaymentPhase) {
        return <Box style={{ width: '28px', height: '28px' }} />
    }
    return children
}
