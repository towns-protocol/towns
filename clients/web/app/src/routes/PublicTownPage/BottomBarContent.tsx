import React, { useEffect, useMemo, useRef } from 'react'
import { useConnectivity } from 'use-towns-client'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { Box, BoxProps, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { JoinLoginButton } from './JoinLoginButton'
import { JoiningOverlay } from './JoiningOverlay'
import { usePublicPageLoginFlow } from './usePublicPageLoginFlow'

export function BottomBarContent({
    leftColWidth,
    rightColWidth,
}: {
    leftColWidth: number
    rightColWidth: number
}) {
    const spaceId = useSpaceIdFromPathname()

    const isJoiningFlow = !!usePublicPageLoginFlow().spaceBeingJoined
    const { isAuthenticated } = useConnectivity()
    // we don't want to hide the public town page while authenticating
    const preventJoiningOverlay = !isJoiningFlow || !isAuthenticated

    const { isTouch } = useDevice()
    const footerRef = useRef<HTMLDivElement>(null)
    const { data: membershipInfo } = useReadableMembershipInfo(spaceId ?? '')
    const { totalSupply, maxSupply } = membershipInfo ?? {}

    useEffect(() => {
        if (!isTouch || !footerRef.current) {
            return
        }
        // Join Town button gets hidden behind Android and Safari nav bars,
        // making it hard to click. This is a common issue when using 100vh on mobile devices
        // native CSS solutions aren't reliable, so we're using JS to adjust the footer position
        const footerHeight = footerRef.current.clientHeight ?? undefined
        if (footerHeight) {
            footerRef.current.style.top = window.innerHeight - footerHeight + 'px'
        }
    }, [isTouch])

    const seatsLeft = (maxSupply && totalSupply && maxSupply - totalSupply) ?? 0
    const maxSupplyReached = seatsLeft === 0

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
            <Stack
                paddingX
                width="100%"
                position="fixed"
                bottom="none"
                borderTop="default"
                background="backdropBlur"
                ref={footerRef}
            >
                <BottomBarWithColWidths
                    leftColWidth={leftColWidth}
                    rightColWidth={rightColWidth}
                    gap={{
                        desktop: 'x20',
                        tablet: 'x4',
                    }}
                    leftColContent={
                        <Stack
                            grow
                            centerContent
                            gap={isTouch ? 'sm' : 'md'}
                            color="default"
                            width={{ default: '600', mobile: '100%' }}
                        >
                            {totalSupply && maxSupply && (
                                <>
                                    <Stack
                                        horizontal={!isTouch}
                                        width="100%"
                                        gap="sm"
                                        data-testid="town-preview-memberships-available-container"
                                    >
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
                    rightColContent={
                        <JoinLoginButton spaceId={spaceId} maxSupplyReached={maxSupplyReached} />
                    }
                />
            </Stack>
            {!preventJoiningOverlay && <JoiningOverlay />}
        </>
    )
}

const BottomBarWithColWidths = ({
    leftColWidth,
    rightColWidth,
    rightColContent,
    leftColContent,
    ...boxProps
}: {
    leftColWidth: number
    rightColWidth: number
    rightColContent: React.ReactNode
    leftColContent: React.ReactNode
} & BoxProps) => {
    const isTouch = useDevice().isTouch
    return (
        <Stack
            horizontal
            centerContent
            position="relative"
            width="100%"
            alignItems="center"
            paddingBottom="safeAreaInsetBottom"
            height={{
                desktop: 'x12',
                mobile: undefined,
            }}
            paddingY="md"
            {...boxProps}
        >
            <Stack absoluteFill />
            <Box
                grow={isTouch}
                position="relative"
                style={{
                    width: isTouch ? undefined : 600,
                }}
            >
                {leftColContent}
            </Box>

            <Box
                position="relative"
                style={{
                    width: isTouch ? undefined : 300,
                }}
            >
                {rightColContent}
            </Box>
        </Stack>
    )
}
