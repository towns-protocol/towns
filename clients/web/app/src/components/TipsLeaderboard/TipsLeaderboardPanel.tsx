import React, { useCallback, useMemo } from 'react'
import {
    SpaceAddressFromSpaceId,
    useGetRootKeyFromLinkedWallet,
    useSpaceData,
    useUserLookupContext,
} from 'use-towns-client'
import { userIdFromAddress } from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useDevice } from 'hooks/useDevice'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'
import { MINUTE_MS } from 'data/constants'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useTipLeaderboard } from './useTipLeaderboard'

export const TipsLeaderboardPanel = () => {
    const space = useSpaceData()
    const spaceAddress = useMemo(() => {
        if (!space?.id) {
            return
        }
        return SpaceAddressFromSpaceId(space.id)
    }, [space?.id])
    const { data, isLoading } = useTipLeaderboard(spaceAddress)

    const hasLeaderboard = data?.leaderboard && Object.keys(data.leaderboard).length > 0

    return (
        <Panel label="Top Tippers" padding="none" paddingX="none">
            <Stack paddingY="sm" gap="xxs" height="100%">
                {isLoading &&
                    // eslint-disable-next-line react/no-array-index-key
                    Array.from({ length: 20 }).map((_, index) => <SkeletonRow key={index} />)}
                {!isLoading && !hasLeaderboard && <EmptyState />}
                {hasLeaderboard &&
                    data?.leaderboard.map(({ userAddress, totalTipped, rank }) => (
                        <Row
                            key={userAddress}
                            userAbstractAccountAddress={userAddress}
                            totalTipped={totalTipped}
                            rank={rank}
                        />
                    ))}
            </Stack>
        </Panel>
    )
}

const Row = ({
    userAbstractAccountAddress,
    totalTipped,
    rank,
}: {
    userAbstractAccountAddress: string
    totalTipped: string
    rank: number
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
    const { openPanel } = usePanelActions()

    const openProfile = useCallback(() => {
        if (userId) {
            openPanel('profile', { profileId: userId })
        }
    }, [openPanel, userId])

    if (!userId) {
        return null
    }

    return (
        <Stack paddingX="sm" paddingY="xxs">
            <Stack
                horizontal
                borderRadius="xs"
                background={{ hover: 'level2', default: undefined }}
                cursor="pointer"
                padding="sm"
                alignItems="center"
            >
                <Stack horizontal gap width="100%" onClick={openProfile}>
                    <Stack horizontal alignItems="center" gap="sm">
                        <Box centerContent width="x3" height="x3">
                            <Medal rank={rank} />
                        </Box>
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
                                tooltip={
                                    !isTouch ? <ProfileHoverCard userId={userId} /> : undefined
                                }
                            >
                                <Avatar userId={userId} size="avatar_x4" />
                            </Box>
                            <Paragraph truncate color="default">
                                {getPrettyDisplayName(globalUser)}
                            </Paragraph>
                        </Stack>
                    </Stack>
                    <Stack grow />

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
        <Stack paddingX="sm" paddingY="xxs">
            <Stack horizontal borderRadius="xs" padding="sm" alignItems="center">
                <Stack horizontal gap width="100%">
                    <Stack horizontal alignItems="center" gap="sm">
                        <Box centerContent width="x3" height="x3">
                            <Box square="square_md" rounded="full" className={shimmerClass} />
                        </Box>
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
                    </Stack>
                    <Stack grow />
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

function Medal({ rank }: { rank: number }) {
    if (rank === 1) {
        return <Icon type="goldMedal" />
    }
    if (rank === 2) {
        return <Icon type="silverMedal" />
    }
    if (rank === 3) {
        return <Icon type="bronzeMedal" />
    }
    return (
        <Box centerContent width="x4" height="x3">
            <Paragraph
                width="x3"
                textAlign="center"
                style={{ fontVariantNumeric: 'tabular-nums' }}
                color="gray2"
            >
                {rank}
            </Paragraph>
        </Box>
    )
}
