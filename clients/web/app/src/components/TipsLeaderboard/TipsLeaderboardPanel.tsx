import React from 'react'
import {
    SpaceAddressFromSpaceId,
    useGetRootKeyFromLinkedWallet,
    useSpaceData,
    useUserLookupContext,
} from 'use-towns-client'
import { userIdFromAddress } from '@river-build/sdk'
import { bin_fromHexString } from '@river-build/dlog'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useDevice } from 'hooks/useDevice'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'
import { MINUTE_MS } from 'data/constants'
import { useTipLeaderboard } from './useTipLeaderboard'

export const TipsLeaderboardPanel = () => {
    const space = useSpaceData()
    const spaceAddress = SpaceAddressFromSpaceId(space?.id ?? '')
    const { data, isLoading } = useTipLeaderboard(spaceAddress)

    const hasLeaderboard = data?.leaderboard && Object.keys(data.leaderboard).length > 0

    return (
        <Panel label="Tip Leaderboard" padding="none" paddingX="none">
            <Stack paddingY="sm" gap="xs" height="100%">
                {isLoading &&
                    // eslint-disable-next-line react/no-array-index-key
                    Array.from({ length: 20 }).map((_, index) => <SkeletonRow key={index} />)}
                {!isLoading && !hasLeaderboard && <EmptyState />}
                {hasLeaderboard &&
                    Object.entries(data.leaderboard).map(([userAddress, totalTippedWei]) => (
                        <Row
                            key={userAddress}
                            userAbstractAccountAddress={userAddress}
                            totalTipped={totalTippedWei}
                        />
                    ))}
            </Stack>
        </Panel>
    )
}

const Row = ({
    userAbstractAccountAddress,
    totalTipped,
}: {
    userAbstractAccountAddress: string
    totalTipped: string
}) => {
    const { isTouch } = useDevice()
    const { lookupUser } = useUserLookupContext()
    const usdAmount = useEthToUsdFormatted({
        ethAmount: BigInt(totalTipped),
        refetchInterval: 1 * MINUTE_MS,
    })

    const { data: rootKeyAddress } = useGetRootKeyFromLinkedWallet({
        walletAddress: userAbstractAccountAddress,
    })
    const userId = rootKeyAddress ? userIdFromAddress(bin_fromHexString(rootKeyAddress)) : undefined
    const globalUser = userId ? lookupUser(userId) : undefined

    if (!userId) {
        return null
    }

    return (
        <Stack padding="sm">
            <Stack
                horizontal
                borderRadius="xs"
                background={{ hover: 'level2', default: undefined }}
                cursor="pointer"
                paddingX="md"
                paddingY="sm"
                alignItems="center"
            >
                <Stack horizontal gap width="100%">
                    <Stack
                        horizontal
                        grow
                        alignItems="center"
                        gap="sm"
                        overflow="hidden"
                        paddingY="xs"
                        insetY="xxs"
                    >
                        <Box
                            centerContent
                            tooltip={!isTouch ? <ProfileHoverCard userId={userId} /> : undefined}
                        >
                            <Avatar userId={userId} size="avatar_x4" />
                        </Box>
                        <Paragraph truncate color="default">
                            {getPrettyDisplayName(globalUser)}
                        </Paragraph>
                    </Stack>
                    <Stack justifyContent="center">
                        <Paragraph
                            truncate
                            color="gray2"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                            {usdAmount}
                        </Paragraph>
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    )
}

function SkeletonRow() {
    return (
        <Stack padding="sm">
            <Stack horizontal borderRadius="xs" paddingX="md" paddingY="sm" alignItems="center">
                <Stack horizontal gap width="100%">
                    <Stack
                        horizontal
                        grow
                        alignItems="center"
                        gap="sm"
                        overflow="hidden"
                        paddingY="xs"
                        insetY="xxs"
                    >
                        <Box centerContent>
                            <Box square="square_lg" rounded="full" className={shimmerClass} />
                        </Box>
                        <Box width="150" height="x2" className={shimmerClass} rounded="xs" />
                    </Stack>
                    <Stack justifyContent="center">
                        <Box width="x10" height="x2" className={shimmerClass} rounded="xs" />
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    )
}

function EmptyState() {
    return (
        <Stack padding="lg" alignItems="center" justifyContent="center" height="100%" gap="sm">
            <Icon type="dollarFilled" size="square_lg" color="cta1" />
            <Paragraph textAlign="center">No tips yet</Paragraph>
            <Paragraph size="sm" color="gray2" textAlign="center">
                Be the first to tip in this space!
            </Paragraph>
        </Stack>
    )
}
