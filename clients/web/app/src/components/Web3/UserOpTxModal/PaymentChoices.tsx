import React from 'react'
import { SpaceInfo } from 'use-towns-client'
import { userOpsStore } from '@towns/userops'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { Box, Button, Icon } from '@ui'
import { useStore } from 'store/store'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PayWithCardButton } from './PayWithCardButton'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'
import { useIsJoinSpace } from './hooks/useIsJoinSpace'

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
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const isJoinSpace = useIsJoinSpace()
    const theme = useStore((s) => s.getTheme())
    const setPromptResponse = userOpsStore((s) => s.setPromptResponse)
    const confirmUserOp = () => setPromptResponse(myAbstractAccountAddress, 'confirm')
    const { clickedPayWithEth } = useJoinFunnelAnalytics()
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
                tone={theme === 'dark' ? 'level3' : 'default'}
                rounded="lg"
                border={theme === 'dark' ? undefined : 'level4'}
                onClick={() => {
                    // add analytics
                    if (balanceIsLessThanCost) {
                        setShowWalletBalance(true)
                    } else {
                        if (isJoinSpace) {
                            clickedPayWithEth({
                                spaceName: getSpaceNameFromCache(spaceId),
                                spaceId,
                                gatedSpace: analytics.gatedSpace,
                                pricingModule: analytics.pricingModule,
                                priceInWei: analytics.priceInWei,
                            })
                        }
                        confirmUserOp?.()
                    }
                }}
            >
                <Icon type="greenEth" />
                Pay with ETH
            </Button>
        </Box>
    )
}
