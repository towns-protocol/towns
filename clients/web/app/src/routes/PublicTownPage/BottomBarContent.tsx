import React, { useMemo } from 'react'
import {
    BlockchainTransactionType,
    useIsTransactionPending,
    useMembershipInfo,
} from 'use-towns-client'
import { ethers } from 'ethers'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { BottomBarWithColWidths } from '@components/Web3/MembershipNFT/BottomBar'
import { Box, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { JoinLoginButton } from './JoinLoginButton'
import { JoiningOverlay } from './JoiningOverlay'

export function BottomBarContent({
    leftColWidth,
    rightColWidth,
    isJoining,
}: {
    leftColWidth: number
    rightColWidth: number
    isJoining: boolean
}) {
    const spaceId = useSpaceIdFromPathname()
    const { data: membershipInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { totalSupply, maxSupply } = membershipInfo ?? {}
    const {
        price: membershipPriceInWei,
        isLoading: isLoadingMembershipPrice,
        error: membershipPriceError,
    } = useMembershipPriceInWei()

    const { isTouch } = useDevice()
    const percentageFilled = useMemo(() => {
        if (!totalSupply || !maxSupply) {
            return 0
        }
        // always show a tiny bit of the progress bar
        return Math.max((maxSupply - totalSupply) / maxSupply, 0.02)
    }, [totalSupply, maxSupply])

    const membershipSupplyText = useMemo(() => {
        if (!totalSupply || !maxSupply) {
            return undefined
        }
        return `${maxSupply - totalSupply}/${maxSupply}`
    }, [totalSupply, maxSupply])
    return (
        <>
            <Stack paddingX width="100%" position="fixed" bottom="none">
                <BottomBarWithColWidths
                    leftColWidth={leftColWidth}
                    rightColWidth={rightColWidth}
                    gap={{
                        desktop: 'x20',
                        tablet: 'x4',
                    }}
                    leftColContent={
                        <Stack grow centerContent gap={isTouch ? 'sm' : 'md'} color="default">
                            {totalSupply && maxSupply && (
                                <>
                                    <Stack horizontal={!isTouch} width="100%" gap="sm">
                                        <Text fontWeight="strong" fontSize={isTouch ? 'sm' : 'md'}>
                                            Memberships Left
                                        </Text>
                                        {!isTouch && <Box grow />}
                                        <Text color="gray2" fontSize={isTouch ? 'sm' : 'md'}>
                                            {membershipSupplyText && membershipSupplyText}
                                        </Text>
                                    </Stack>
                                    <Box
                                        position="relative"
                                        height="x1"
                                        width="100%"
                                        background="level2"
                                        rounded="full"
                                    >
                                        <Box
                                            position="absolute"
                                            height="x1"
                                            background="cta1"
                                            rounded="full"
                                            style={{ width: `${percentageFilled * 100}%` }}
                                        />
                                    </Box>
                                </>
                            )}
                        </Stack>
                    }
                    rightColContent={<JoinLoginButton spaceId={spaceId} />}
                />
            </Stack>
            {isJoining && <JoiningOverlay />}
            <UserOpTxModal
                membershipPrice={membershipPriceInWei}
                isLoadingMembershipPrice={isLoadingMembershipPrice}
                membershipPriceError={membershipPriceError}
            />
        </>
    )
}

function useMembershipPriceInWei() {
    const spaceId = useSpaceIdFromPathname()

    const {
        data: membershipInfo,
        isLoading: isLoadingMembershipInfo,
        error,
    } = useMembershipInfo(spaceId ?? '')
    const isJoinPending = useIsTransactionPending(BlockchainTransactionType.JoinSpace)

    return useMemo(() => {
        if (!isJoinPending) {
            return { price: undefined, isLoading: false, error }
        }
        if (isLoadingMembershipInfo) {
            return { price: undefined, isLoading: true, error }
        }
        if (!membershipInfo) {
            return { price: undefined, isLoading: false, error }
        }
        return {
            price: ethers.BigNumber.from(membershipInfo.price).toBigInt(),
            isLoading: false,
            error,
        }
    }, [isJoinPending, isLoadingMembershipInfo, membershipInfo, error])
}
