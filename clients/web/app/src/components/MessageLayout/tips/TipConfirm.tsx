import React, { useState } from 'react'
import {
    Address,
    BlockchainTransactionType,
    ETH_ADDRESS,
    LookupUser,
    useChannelData,
    useContractSpaceInfoWithoutClient,
    useIsTransactionPending,
    useTipTransaction,
    useTokenIdOfOwner,
} from 'use-towns-client'
import { Box, Button, Stack, Text } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { calculateEthAmountFromUsd, useEthPrice } from '@components/Web3/useEthPrice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import {
    // We need useAbstractAccountAddress in order to grab the tip recipient's abstract account address so we can send the tip there!!
    // eslint-disable-next-line
    useAbstractAccountAddress,
    useMyAbstractAccountAddress,
} from 'hooks/useAbstractAccountAddress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useBalance } from 'hooks/useBalance'
import { useStore } from 'store/store'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { env } from 'utils'
import { TipOption } from './types'
import { trackPostedTip } from './tipAnalytics'

const IS_ETH_MODE = env.VITE_TIPS_IN_ETH

export function TipConfirm(props: {
    tipValue: TipOption | undefined
    setTipValue: (tipValue: TipOption | undefined) => void
    messageOwner: LookupUser
    eventId: string
    onTip?: () => void
    onInsufficientBalance?: () => void
    onCancel?: () => void
}) {
    const { tipValue, setTipValue, messageOwner, eventId, onTip, onInsufficientBalance, onCancel } =
        props

    const tipPending = useIsTransactionPending(BlockchainTransactionType.Tip)

    const {
        data: price,
        isLoading: isLoadingPrice,
        isError: isErrorPrice,
    } = useEthPrice({
        enabled: !!tipValue,
        refetchInterval: 8_000,
    })
    const spaceId = useSpaceIdFromPathname()
    const channelData = useChannelData()
    const channelId = channelData?.channelId
    const {
        data: tokenId,
        isLoading: isLoadingTokenId,
        isError: isErrorTokenId,
    } = useTokenIdOfOwner(spaceId, messageOwner.userId)
    const loading = isLoadingPrice || !price || isLoadingTokenId

    const { data: messageOwnerAbstractAccount } = useAbstractAccountAddress({
        rootKeyAddress: messageOwner.userId as Address,
    })

    const { data: myAbstractAccount } = useMyAbstractAccountAddress()

    const { data: balance } = useBalance({
        address: myAbstractAccount,
        enabled: !!myAbstractAccount,
    })

    const ethAmount = IS_ETH_MODE
        ? tipValue?.ethAmount
            ? {
                  value: BigInt(Math.round(tipValue.ethAmount * 1e18)),
                  formatted: tipValue.ethAmount.toString(),
              }
            : undefined
        : tipValue && price
        ? calculateEthAmountFromUsd({
              cents: tipValue.amountInCents,
              ethPriceInUsd: price,
          })
        : undefined

    const { tip } = useTipTransaction()

    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId: spaceId,
        channelId: channelId,
    })
    const { data: spaceInfo } = useContractSpaceInfoWithoutClient(spaceId)

    const _onTip = async (getSigner: GetSigner) => {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        if (
            !messageOwnerAbstractAccount ||
            !spaceId ||
            !channelId ||
            !tipValue ||
            !ethAmount ||
            !myAbstractAccount
        ) {
            console.error('Missing required data for tip transaction', {
                messageOwnerAbstractAccount,
                spaceId,
                channelId,
                tipValue,
                ethAmount,
            })
            popupToast(({ toast }) => (
                <StandardToast.Error message="Cannot process tip" toast={toast} />
            ))
            return
        }

        if (!tokenId) {
            popupToast(({ toast }) => (
                <StandardToast.Error message="Cannot process tip" toast={toast} />
            ))
            return
        }

        await tip(
            {
                spaceId,
                receiverTokenId: tokenId,
                receiverUserId: messageOwner.userId,
                receiverUsername: messageOwner.username,
                receiverAddress: messageOwnerAbstractAccount,
                senderAddress: myAbstractAccount,
                messageId: eventId,
                channelId,
                currency: ETH_ADDRESS,
                amount: ethAmount.value,
                signer,
            },
            {
                onSuccess: (tipEvent) => {
                    trackPostedTip({
                        cents: tipValue.amountInCents,
                        tipAmount: ethAmount.formatted,
                        receipient: tipEvent.receiver,
                        spaceName: spaceInfo?.name ?? '',
                        spaceId,
                        isGated: spaceDetailsAnalytics.gatedSpace,
                        pricingModule: spaceDetailsAnalytics.pricingModule,
                    })
                    onTip?.()
                },
            },
        )
    }

    if (!tipValue) {
        return null
    }

    return (
        <Stack gap="sm">
            {loading && !isErrorPrice && !isErrorTokenId ? (
                <Loading />
            ) : ethAmount && balance && balance.value <= ethAmount.value ? (
                <InsufficientTipBalance
                    setTipValue={setTipValue}
                    onInsufficientBalance={onInsufficientBalance}
                />
            ) : (
                <Summary
                    tipValue={tipValue}
                    ethAmount={ethAmount}
                    isErrorPrice={isErrorPrice}
                    isErrorTokenId={isErrorTokenId}
                    loading={loading}
                    messageOwner={messageOwner}
                    tipPending={tipPending}
                    setTipValue={setTipValue}
                    onTip={_onTip}
                    onCancel={onCancel}
                />
            )}
        </Stack>
    )
}

function Loading() {
    return (
        <Box centerContent height="x8">
            <ButtonSpinner color="gray2" />
        </Box>
    )
}

function InsufficientTipBalance(props: {
    setTipValue: (tipValue: TipOption | undefined) => void
    onInsufficientBalance?: () => void
}) {
    const { setTipValue, onInsufficientBalance } = props
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    return (
        <Box centerContent gap="md">
            <Text strong textAlign="center">
                {`You don't have enough ETH`}
            </Text>
            <Button
                tone="cta1"
                rounded="md"
                size="button_sm"
                onClick={() => {
                    setTipValue(undefined)
                    onInsufficientBalance?.()
                    setFundWalletModalOpen(true)
                }}
            >
                Add Funds
            </Button>
        </Box>
    )
}

function Summary(props: {
    tipValue: TipOption
    ethAmount: { value: bigint; formatted: string } | undefined
    isErrorPrice: boolean
    isErrorTokenId: boolean
    loading: boolean
    messageOwner: LookupUser
    onTip: (getSigner: GetSigner) => void
    setTipValue: (tipValue: TipOption | undefined) => void
    onCancel?: () => void
    tipPending: boolean
}) {
    const {
        tipValue,
        ethAmount,
        isErrorPrice,
        isErrorTokenId,
        loading,
        messageOwner,
        onTip,
        setTipValue,
        onCancel,
        tipPending,
    } = props

    const [isSending, setIsSending] = useState(false)

    const handleTip = (getSigner: GetSigner) => {
        setIsSending(true)
        onTip(getSigner)
    }

    return (
        <>
            <Box gap="md">
                <Text strong textAlign="center">
                    Confirm Tip
                </Text>
                {isErrorPrice ? (
                    <Text textAlign="center" color="negative" paddingBottom="sm">
                        Failed to fetch ETH price
                    </Text>
                ) : isErrorTokenId ? (
                    <Text textAlign="center" color="negative" paddingBottom="sm">
                        {`Failed to fetch token id for ${messageOwner.username}`}
                    </Text>
                ) : loading ? (
                    <Loading />
                ) : (
                    <Box paddingBottom="sm">
                        <Text textAlign="center" color="gray2" size="sm">
                            {IS_ETH_MODE ? (
                                <>
                                    {tipValue.label} (${(tipValue.amountInCents / 100).toFixed(2)}{' '}
                                    USD) will be sent to @{messageOwner.username}?
                                </>
                            ) : (
                                <>
                                    {tipValue.label} ({ethAmount?.formatted} ETH) will be sent to @
                                    {messageOwner.username}?
                                </>
                            )}
                        </Text>
                    </Box>
                )}
            </Box>

            <WalletReady>
                {({ getSigner }) => (
                    <Button
                        tone="cta1"
                        rounded="md"
                        size="button_sm"
                        disabled={loading || tipPending || isSending}
                        onClick={() => handleTip(getSigner)}
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </Button>
                )}
            </WalletReady>
            <Button
                color="cta1"
                rounded="md"
                size="button_sm"
                disabled={tipPending || isSending}
                onClick={() => {
                    setTipValue(undefined)
                    onCancel?.()
                }}
            >
                Cancel
            </Button>
        </>
    )
}
