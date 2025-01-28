import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import React, { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useConnectivity, useContractSpaceInfoWithoutClient } from 'use-towns-client'
import { Address } from 'viem'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { formatUnits, formatUnitsToFixedLength, useBalance } from 'hooks/useBalance'
import { isTouch } from 'hooks/useDevice'
import { Box, IconButton, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { CrossmintPayment } from '@components/CrossmintPayment'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useInsufficientBalance } from './hooks/useInsufficientBalance'
import { usePriceBreakdown } from './hooks/usePriceBreakdown'
import { useToAddress } from './hooks/useToAddress'
import { useJoinTransactionModalShownAnalyticsEvent } from './hooks/useJoinTransactionModalShownAnalyticsEvent'
import { PaymentChoices } from './PaymentChoices'
import { useCrossmintHandlers } from './hooks/useCrossmintHandlers'
import { GasTooLowMessage } from './GasTooLowMessage'
import { RejectedSponsorshipMessage } from './RejectSponsorshipMessage'
import { InsufficientBalanceForPayWithEth } from './InsufficientBalanceForPayWithEth'
import { ChargesSummary } from './ChargesSummary'
import { WalletBalance } from './WalletBalance'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'

export function StandardUseropTx({
    disableUiWhileCrossmintPaymentPhase,
    setDisableUiWhileCrossmintPaymentPhase,
}: {
    disableUiWhileCrossmintPaymentPhase: boolean
    setDisableUiWhileCrossmintPaymentPhase: (value: boolean) => void
}): JSX.Element {
    const [showCrossmintPayment, setShowCrossmintPayment] = useState(false)
    const [showWalletBalance, setShowWalletBalance] = useState(false)
    const [showWalletWarning, setShowWalletWarning] = useState(false)
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { current } = userOpsStore(
        useShallow((s) => ({
            current: selectUserOpsByAddress(myAbstractAccountAddress, s)?.current,
        })),
    )
    const currOp = current?.op
    const currOpDecodedCallData = current?.decodedCallData
    const currOpValue = current?.value

    const isJoiningSpace = !!usePublicPageLoginFlow().spaceBeingJoined
    const spaceId = useSpaceIdFromPathname()

    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)

    const toAddress = useToAddress()

    const { loggedInWalletAddress } = useConnectivity()

    const { data: smartAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress as Address,
    })

    const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
        fixedLength: 18,
    })

    const gasPrice = currOp?.maxFeePerGas ?? 0.0
    const gasLimit = currOp?.callGasLimit ?? 0.0
    const verificationGasLimit = currOp?.verificationGasLimit ?? 0.0
    const preVerificationGas = currOp?.preVerificationGas ?? 0.0

    const balanceIsLessThanCost = useInsufficientBalance({
        balance: balanceData?.value,
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
        value: currOpValue,
        currOpDecodedCallData,
    })

    const { gasInEth, currOpValueInEth, totalInEth } = usePriceBreakdown({
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
        value: currOpValue,
        balanceIsLessThanCost,
    })

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

    const _isTouch = isTouch()

    const handleBack = () => {
        setShowCrossmintPayment(false)
        setShowWalletBalance(false)
    }

    const { handleCrossmintPaymentStart, handleCrossmintFailure, handleCrossmintComplete } =
        useCrossmintHandlers({
            setDisableUiWhileCrossmintPaymentPhase,
            setShowCrossmintPayment,
            spaceInfo,
        })

    const { isLoading: isSmartAccountDeployedLoading } = useIsSmartAccountDeployed()
    const { clickCopyWalletAddress } = useJoinFunnelAnalytics()

    const onCopyWalletAddressClick = () => {
        setShowWalletWarning(true)
        if (isJoiningSpace) {
            clickCopyWalletAddress({ spaceId, spaceName: spaceInfo?.name })
        }
    }

    const isTransferEth = currOpDecodedCallData?.functionHash === 'transferEth'

    return (
        <>
            <HeaderButtons
                showCrossmintPayment={showCrossmintPayment}
                showWalletBalance={showWalletBalance}
                disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                onBack={handleBack}
            />
            {showCrossmintPayment && spaceInfo?.address ? (
                <CrossmintPayment
                    contractAddress={spaceInfo.address}
                    townWalletAddress={smartAccountAddress || ''}
                    price={formatUnits(BigInt(currOpValue?.toString() ?? 0), 18)}
                    onComplete={handleCrossmintComplete}
                    onPaymentStart={handleCrossmintPaymentStart}
                    onPaymentFailure={handleCrossmintFailure}
                />
            ) : (
                <>
                    <Box gap centerContent width={!_isTouch ? '400' : undefined}>
                        <ChargesSummary
                            gasInEth={gasInEth}
                            totalInEth={totalInEth}
                            balanceIsLessThanCost={balanceIsLessThanCost}
                            currOpValueInEth={currOpValueInEth}
                        />

                        {(showWalletBalance || !balanceIsLessThanCost) && (
                            <WalletBalance
                                toAddress={toAddress}
                                isLoadingBalance={isLoadingBalance}
                                smartAccountAddress={smartAccountAddress}
                                formattedBalance={formattedBalance}
                                balanceIsLessThanCost={balanceIsLessThanCost}
                            />
                        )}
                        <RejectedSponsorshipMessage />
                        <GasTooLowMessage />
                    </Box>
                    {!balanceData ? (
                        <Box centerContent height="x4" width="100%" />
                    ) : isSmartAccountDeployedLoading ? (
                        <ButtonSpinner />
                    ) : isTransferEth && balanceIsLessThanCost ? (
                        <BalanceTooLowForTransferEth />
                    ) : showWalletBalance && balanceIsLessThanCost ? (
                        <InsufficientBalanceForPayWithEth
                            smartAccountAddress={smartAccountAddress}
                            showWalletWarning={showWalletWarning}
                            onCopyClick={onCopyWalletAddressClick}
                        />
                    ) : (
                        <PaymentChoices
                            spaceInfo={spaceInfo}
                            balanceIsLessThanCost={balanceIsLessThanCost}
                            setShowCrossmintPayment={setShowCrossmintPayment}
                            setShowWalletBalance={setShowWalletBalance}
                        />
                    )}
                </>
            )}
        </>
    )
}

function BalanceTooLowForTransferEth() {
    return (
        <Box paddingY="md" maxWidth="400">
            <Box background="negativeSubtle" padding="md">
                <Text>Your wallet balance will not cover the gas fees for this transaction.</Text>
            </Box>
        </Box>
    )
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

function HeaderButtons(props: {
    showCrossmintPayment: boolean
    showWalletBalance: boolean
    onBack: () => void
    disableUiWhileCrossmintPaymentPhase: boolean
}) {
    const { disableUiWhileCrossmintPaymentPhase, showCrossmintPayment, showWalletBalance, onBack } =
        props
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const setPromptResponse = userOpsStore((s) => s.setPromptResponse)
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()

    return (
        <Box horizontal justifyContent="spaceBetween">
            {showCrossmintPayment || showWalletBalance ? (
                <PlaceholderOrIcon
                    disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                >
                    <IconButton icon="arrowLeft" onClick={onBack} />
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
                        if (myAbstractAccountAddress) {
                            setPromptResponse?.(myAbstractAccountAddress, 'deny')
                        }
                    }}
                />
            </PlaceholderOrIcon>
        </Box>
    )
}
