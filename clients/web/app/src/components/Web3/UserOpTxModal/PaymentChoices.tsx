import React from 'react'
import { SpaceInfo } from 'use-towns-client'
import { userOpsStore } from '@towns/userops'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { Box, Button, Icon } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { useStore } from 'store/store'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PayWithCardButton } from './PayWithCardButton'

export function PaymentChoices(props: {
    spaceInfo: SpaceInfo | undefined
    balanceIsLessThanCost: boolean
    setShowCrossmintPayment: (value: boolean) => void
    setShowWalletBalance: (value: boolean) => void
}) {
    const { spaceInfo, balanceIsLessThanCost, setShowCrossmintPayment, setShowWalletBalance } =
        props
    const spaceId = useSpaceIdFromPathname()
    const analytics = useGatherSpaceDetailsAnalytics({
        spaceId,
    })
    const currOpDecodedCallData = userOpsStore((s) => s.currOpDecodedCallData)
    const isJoinSpace =
        currOpDecodedCallData?.type === 'joinSpace' ||
        currOpDecodedCallData?.type === 'joinSpace_linkWallet'
    const theme = useStore((s) => s.getTheme())
    const confirm = userOpsStore((s) => s.confirm)
    const { clickConfirmJoinTransaction } = useJoinFunnelAnalytics()
    const isJoiningSpace = !!usePublicPageLoginFlow().spaceBeingJoined

    const onPayWithEth = () => {
        confirm?.()
        if (isJoiningSpace) {
            clickConfirmJoinTransaction()
        }
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
                tone={theme === 'dark' ? 'level3' : 'none'}
                rounded="lg"
                border={theme === 'dark' ? undefined : 'level4'}
                onClick={() => {
                    // add analytics
                    if (balanceIsLessThanCost) {
                        setShowWalletBalance(true)
                    } else {
                        Analytics.getInstance().track('clicked pay with ETH', {
                            spaceName: getSpaceNameFromCache(spaceId),
                            spaceId,
                            gatedSpace: analytics.gatedSpace,
                            pricingModule: analytics.pricingModule,
                            priceInWei: analytics.priceInWei,
                        })
                        onPayWithEth()
                    }
                }}
            >
                <Icon type="greenEth" />
                Pay with ETH
            </Button>
        </Box>
    )
}
