import { PaymasterErrorCode, userOpsStore } from '@towns/userops'
import { BigNumber } from 'ethers'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Address, useConnectivity, useContractSpaceInfoWithoutClient } from 'use-towns-client'
import { useShallow } from 'zustand/react/shallow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { Box, Button, Heading, Icon, IconButton, Paragraph, Text, Tooltip } from '@ui'
import { BRIDGE_LEARN_MORE_LINK } from 'data/links'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { formatUnitsToFixedLength, useBalance } from 'hooks/useBalance'
import { isTouch, useDevice } from 'hooks/useDevice'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { CopyWalletAddressButton } from '../GatedTownModal/Buttons'

export function UserOpTxModal() {
    const { currOp, confirm, deny } = userOpsStore()
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { isTouch } = useDevice()

    if (typeof confirm !== 'function' || !currOp) {
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
            <UserOpTxModalContent endPublicPageLoginFlow={endPublicPageLoginFlow} />
        </AboveAppProgressModalContainer>
    )
}

function UserOpTxModalContent({ endPublicPageLoginFlow }: { endPublicPageLoginFlow: () => void }) {
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
                </>
            )
        }
        return (
            <Button tone="cta1" width="100%" onClick={onConfirm}>
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
                    deny?.()
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

                {bottomContent()}
            </Box>
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
