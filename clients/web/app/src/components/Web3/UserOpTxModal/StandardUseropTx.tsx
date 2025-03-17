import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import React, { useCallback, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useConnectivity, useContractSpaceInfoWithoutClient } from 'use-towns-client'
import { Address } from 'viem'
import { AnimatePresence } from 'framer-motion'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { formatUnits, useBalance } from 'hooks/useBalance'
import { Box, IconButton, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { CrossmintPayment } from '@components/CrossmintPayment'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { FadeInBox } from '@components/Transitions'
import { isTouch } from 'hooks/useDevice'
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
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'
import { FundWallet } from './FundWallet'
import {
    isDepositEth,
    isPayWithCard,
    isPayWithEth,
    useUserOpTxModalContext,
} from './UserOpTxModalContext'
import { RecipientText } from './RecipientText'
import { useDecodedCallData } from './hooks/useDecodedCallData'

export function StandardUseropTx({
    disableModalActions,
    setDisableModalActions,
}: {
    disableModalActions: boolean
    setDisableModalActions: (value: boolean) => void
}): JSX.Element {
    const [showWalletWarning, setShowWalletWarning] = useState(false)
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { current } = userOpsStore(
        useShallow((s) => ({
            current: selectUserOpsByAddress(myAbstractAccountAddress, s)?.current,
        })),
    )
    const currOp = current?.op
    const currFunctionHash = current?.functionHashForPaymasterProxy
    const currOpDecodedCallData = useDecodedCallData()
    const currOpValue = currOpDecodedCallData?.value

    const { view, setView } = useUserOpTxModalContext()

    const isJoiningSpace = !!usePublicPageLoginFlow().spaceBeingJoined
    const spaceId = useSpaceIdFromPathname()

    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)

    const toAddress = useToAddress()

    const { loggedInWalletAddress } = useConnectivity()

    const { data: smartAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress as Address,
    })

    const { data: balanceData } = useBalance({
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
        functionHash: currFunctionHash,
    })

    const { gasInEth, currOpValueInEth, totalInEth, gasCost } = usePriceBreakdown({
        gasLimit,
        preVerificationGas,
        verificationGasLimit,
        gasPrice,
        value: currOpValue,
    })

    useJoinTransactionModalShownAnalyticsEvent({
        spaceId,
        spaceName: spaceInfo?.name,
        isJoiningSpace,
        balanceIsLessThanCost: !!balanceIsLessThanCost,
    })

    const handleBack = useCallback(() => {
        if (view == 'depositEth') {
            setView('payEth')
        } else {
            setView(undefined)
        }
        setShowWalletWarning(false)
    }, [view, setView])

    const { handleCrossmintPaymentStart, handleCrossmintFailure, handleCrossmintComplete } =
        useCrossmintHandlers({
            setDisableModalActions,
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

    const isTransferEth = currFunctionHash === 'transferEth'
    const _isTouch = isTouch()

    return (
        <Box
            gap
            position="relative"
            background={_isTouch ? undefined : 'level2'}
            padding="md"
            width={!_isTouch ? '420' : 'auto'}
            maxWidth="420"
        >
            <Header disableModalActions={disableModalActions} onBack={handleBack} />
            <AnimatePresence mode="wait">
                {isPayWithCard(view) && spaceInfo?.address ? (
                    <FadeInBox key="crossmint">
                        <CrossmintPayment
                            contractAddress={spaceInfo.address}
                            townWalletAddress={smartAccountAddress || ''}
                            price={formatUnits(BigInt(currOpValue?.toString() ?? 0), 18)}
                            onComplete={handleCrossmintComplete}
                            onPaymentStart={handleCrossmintPaymentStart}
                            onPaymentFailure={handleCrossmintFailure}
                        />
                    </FadeInBox>
                ) : isPayWithEth(view) ? (
                    <FadeInBox key="insufficient-balance">
                        <InsufficientBalanceForPayWithEth
                            smartAccountAddress={smartAccountAddress}
                            showWalletWarning={showWalletWarning}
                            totalInEth={totalInEth}
                            cost={totalInEth.value}
                            onCopyClick={onCopyWalletAddressClick}
                        />
                    </FadeInBox>
                ) : isDepositEth(view) ? (
                    <FadeInBox key="fund-wallet">
                        <FundWallet cost={totalInEth.value} />
                    </FadeInBox>
                ) : (
                    <FadeInBox gap key="charges-summary">
                        <Box centerContent gap>
                            <ChargesSummary
                                spaceId={spaceId}
                                gasCost={gasCost}
                                gasInEth={gasInEth}
                                totalInEth={totalInEth.truncated}
                                currOpValueInEth={currOpValueInEth}
                                value={currOpValue}
                            />

                            <RejectedSponsorshipMessage />
                            <GasTooLowMessage />
                            {toAddress && <RecipientText sendingTo={toAddress} />}
                        </Box>
                        {!balanceData ? (
                            <Box centerContent height="x4" width="100%" />
                        ) : isSmartAccountDeployedLoading ? (
                            <ButtonSpinner />
                        ) : isTransferEth && balanceIsLessThanCost ? (
                            <BalanceTooLowForTransferEth />
                        ) : (
                            <PaymentChoices
                                spaceInfo={spaceInfo}
                                balanceIsLessThanCost={balanceIsLessThanCost}
                            />
                        )}
                    </FadeInBox>
                )}
            </AnimatePresence>
        </Box>
    )
}

function BalanceTooLowForTransferEth() {
    return (
        <Box paddingY="md">
            <Box background="negativeSubtle" padding="md">
                <Text>Your wallet balance will not cover the gas fees for this transaction.</Text>
            </Box>
        </Box>
    )
}

function PlaceholderOrIcon({
    disableModalActions,
    children,
}: {
    disableModalActions: boolean
    children: React.ReactNode
}) {
    if (disableModalActions) {
        return <Box style={{ width: '28px', height: '28px' }} />
    }
    return children
}

function Header(props: { disableModalActions: boolean; onBack: () => void }) {
    const { disableModalActions, onBack } = props
    const { view } = useUserOpTxModalContext()
    const _isPayWithCard = isPayWithCard(view)
    const _isPayWithEth = isPayWithEth(view)
    const _isDepositEth = isDepositEth(view)
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const setPromptResponse = userOpsStore((s) => s.setPromptResponse)
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const title = _isPayWithCard
        ? 'Pay with Card'
        : _isPayWithEth || _isDepositEth
        ? 'Deposit ETH'
        : 'Confirm Payment'

    return (
        <Box horizontal alignItems="center" justifyContent="spaceBetween">
            {_isPayWithCard || _isPayWithEth || _isDepositEth ? (
                <PlaceholderOrIcon disableModalActions={disableModalActions}>
                    <IconButton icon="arrowLeft" onClick={onBack} />
                </PlaceholderOrIcon>
            ) : (
                <Box width="x3" />
            )}
            <Text strong size="lg">
                {title}
            </Text>
            <PlaceholderOrIcon disableModalActions={disableModalActions}>
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
