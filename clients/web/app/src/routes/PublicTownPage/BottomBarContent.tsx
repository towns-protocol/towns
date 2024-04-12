import React, { useMemo } from 'react'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { BottomBarWithColWidths } from '@components/Web3/MembershipNFT/BottomBar'
import { Box, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { JoinLoginButton } from './JoinLoginButton'

export function BottomBarContent({
    leftColWidth,
    rightColWidth,
}: {
    leftColWidth: number
    rightColWidth: number
}) {
    const spaceId = useSpaceIdFromPathname()
    const { data: membershipInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { totalSupply, maxSupply } = membershipInfo ?? {}

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
    )
}
