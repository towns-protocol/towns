import React from 'react'
import {
    Address,
    ETH_ADDRESS,
    LookupUser,
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
import { TipOption } from './types'

export function TipConfirm(props: {
    tipValue: TipOption | undefined
    setTipValue: (tipValue: TipOption | undefined) => void
    senderUser: LookupUser
    eventId: string
    onTip?: () => void
}) {
    const { tipValue, setTipValue, senderUser, eventId, onTip } = props
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

    const { data: senderAbstractAccount } = useAbstractAccountAddress({
        rootKeyAddress: senderUser.userId as Address,
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
        if (!senderAbstractAccount || !spaceId || !channelId || !tipValue || !ethAmount) {
            console.error('Missing required data for tip transaction', {
                senderAbstractAccount,
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
            senderAbstractAccount,
        )

        if (!tokenId) {
            popupToast(({ toast }) => (
                <StandardToast.Error message="Cannot process tip" toast={toast} />
            ))
            return
        }

        tip({
            spaceId,
            receiverTokenId: tokenId,
            receiverUsername: senderUser.username,
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
            <Box gap="md">
                <Text strong textAlign="center">
                    Confirm Tip
                </Text>
                {isErrorPrice ? (
                    <Text textAlign="center" color="negative" paddingBottom="sm">
                        Failed to fetch ETH price
                    </Text>
                ) : loading ? (
                    <Box centerContent height="x6">
                        <ButtonSpinner color="gray2" />
                    </Box>
                ) : (
                    <Box paddingBottom="sm">
                        <Text textAlign="center" color="gray2" size="sm">
                            {tipValue.label} ({ethAmount?.formatted} ETH) will be sent to @
                            {senderUser.username}?
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
                        onClick={() => _onTip(getSigner)}
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
        </Stack>
    )
}
