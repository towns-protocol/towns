import React from 'react'
import { SpaceInfo } from 'use-towns-client'
import { userOpsStore } from '@towns/userops'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { Box, Button, Icon } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { PayWithCardButton } from './PayWithCardButton'
import { useUserOpTxModalContext } from './UserOpTxModalContext'
import { useIsJoinSpace } from './hooks/useIsJoinSpace'

export function PaymentChoices(props: {
    spaceInfo: SpaceInfo | undefined
    balanceIsLessThanCost: boolean
}) {
    const { spaceInfo, balanceIsLessThanCost } = props
    const { setView } = useUserOpTxModalContext()
    const spaceId = useSpaceIdFromPathname()
    const analytics = useGatherSpaceDetailsAnalytics({
        spaceId,
    })
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const isJoinSpace = useIsJoinSpace()
    const setPromptResponse = userOpsStore((s) => s.setPromptResponse)
    const confirmUserOp = () => setPromptResponse(myAbstractAccountAddress, 'confirm')
    const { clickedPayWithEth } = useJoinFunnelAnalytics()
    return (
        <Box gap="md">
            <Button
                tone="cta1"
                rounded="lg"
                onClick={() => {
                    // add analytics
                    if (balanceIsLessThanCost) {
                        setView('payEth')
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
                <Icon type="base" />
                Pay with ETH
            </Button>

            {isJoinSpace && spaceInfo?.address && (
                <PayWithCardButton
                    spaceDetailsAnalytics={analytics}
                    contractAddress={spaceInfo.address}
                    onClick={() => setView('payCard')}
                />
            )}
        </Box>
    )
}
