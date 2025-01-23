import React from 'react'
import { SpaceInfo } from 'use-towns-client'
import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { Box, Button, Icon } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PayWithCardButton } from './PayWithCardButton'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'
import { useUserOpTxModalContext } from './UserOpTxModalContext'

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
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.currOpDecodedCallData,
    )
    const isJoinSpace =
        currOpDecodedCallData?.type === 'joinSpace' ||
        currOpDecodedCallData?.type === 'joinSpace_linkWallet'
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
                <Icon type="base" color="level1" />
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
