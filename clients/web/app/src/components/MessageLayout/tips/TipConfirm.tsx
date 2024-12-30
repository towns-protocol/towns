import React from 'react'
import {
    Address,
    ETH_ADDRESS,
    LookupUser,
    useConnectivity,
    useTipTransaction,
    useTownsClient,
} from 'use-towns-client'
import { Box, Button, Stack, Text } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { calculateEthAmountFromUsd, useEthPrice } from '@components/Web3/useEthPrice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useBalance } from 'hooks/useBalance'
import { useStore } from 'store/store'
import { TipOption } from './types'

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
    const loading = isLoadingPrice || !price
    const spaceId = useSpaceIdFromPathname()
    const channelId = useChannelIdFromPathname()
    const { clientSingleton } = useTownsClient()
    const { loggedInWalletAddress } = useConnectivity()

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

        const tokenId = await clientSingleton?.spaceDapp.getTokenIdOfOwner(
            spaceId,
            messageOwnerAbstractAccount,
        )

        if (!tokenId) {
            popupToast(({ toast }) => (
                <StandardToast.Error message="Cannot process tip" toast={toast} />
            ))
            return
        }

        await tip({
            spaceId,
            receiverTokenId: tokenId,
            receiverUserId: messageOwner.userId,
            receiverUsername: messageOwner.username,
            senderAddress: myAbstractAccount,
            messageId: eventId,
            channelId,
            currency: ETH_ADDRESS,
            amount: ethAmount.value,
            signer,
        })
    }

    if (!tipValue) {
        return null
    }

    return (
        <Stack gap="sm">
            {loading && !isErrorPrice ? (
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
    loading: boolean
    messageOwner: LookupUser
    onTip: (getSigner: GetSigner) => void
    setTipValue: (tipValue: TipOption | undefined) => void
}) {
    const { tipValue, ethAmount, isErrorPrice, loading, messageOwner, onTip, setTipValue } = props
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
