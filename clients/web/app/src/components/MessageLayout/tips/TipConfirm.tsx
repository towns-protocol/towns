import React from 'react'
import {
    Address,
    ETH_ADDRESS,
    LookupUser,
    useChannelData,
    useConnectivity,
    useContractSpaceInfoWithoutClient,
    useTipTransaction,
    useTokenIdOfOwner,
} from 'use-towns-client'
import { Box, Button, Stack, Text } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { calculateEthAmountFromUsd, useEthPrice } from '@components/Web3/useEthPrice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useBalance } from 'hooks/useBalance'
import { useStore } from 'store/store'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { TipOption } from './types'
import { trackPostedTip } from './tipAnalytics'

export function TipConfirm(props: {
    tipValue: TipOption | undefined
    setTipValue: (tipValue: TipOption | undefined) => void
    messageOwner: LookupUser
    eventId: string
    onTip?: () => void
    onInsufficientBalance?: () => void
}) {
    const { tipValue, setTipValue, messageOwner, eventId, onTip, onInsufficientBalance } = props

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
    const { loggedInWalletAddress } = useConnectivity()
    const {
        data: tokenId,
        isLoading: isLoadingTokenId,
        isError: isErrorTokenId,
    } = useTokenIdOfOwner(spaceId, messageOwner.userId)
    const loading = isLoadingPrice || !price || isLoadingTokenId

    const { data: messageOwnerAbstractAccount } = useAbstractAccountAddress({
        rootKeyAddress: messageOwner.userId as Address,
    })

    const { data: myAbstractAccount } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress as Address,
    })

    const { data: balance } = useBalance({
        address: myAbstractAccount,
        enabled: !!myAbstractAccount,
    })

    const ethAmount =
        tipValue && price
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
        onTip?.()
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
                    setTipValue={setTipValue}
                    onTip={_onTip}
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
    } = props
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
                            {tipValue.label} ({ethAmount?.formatted} ETH) will be sent to @
                            {messageOwner.username}?
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
                        disabled={loading}
                        onClick={() => onTip(getSigner)}
                    >
                        Send
                    </Button>
                )}
            </WalletReady>
            <Button
                color="cta1"
                rounded="md"
                size="button_sm"
                onClick={() => {
                    setTipValue(undefined)
                }}
            >
                Cancel
            </Button>
        </>
    )
}
