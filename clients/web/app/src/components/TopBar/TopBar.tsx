import React, { useRef } from 'react'
import { useLocation } from 'react-router'
import { BugReportButton } from '@components/BugReportButton/BugReportButton'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SearchBar } from '@components/SearchBar/SearchBar'
import { Box, Card, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { MintAnimation } from '@components/MintAnimation/MintAnimation'
import { useStore } from 'store/store'
import { NodeStatusButton } from '@components/NodeConnectionStatusPanel/ConnectionStatusButton'
import { useIsHNTMember } from 'hooks/useIsHNTMember'
import { WalletButton } from '@components/WalletButton/WalletButton'
import { PointsButton } from './PointsButton'

export const TopBar = () => {
    const recentlyMintedSpaceToken = useStore((s) => s.recentlyMintedSpaceToken)
    const profileButtonRef = useRef<HTMLElement>(null)
    const location = useLocation()
    const noSearchBar = location.pathname === '/explore' || location.pathname === '/'
    const { isHNTMember } = useIsHNTMember()

    return (
        <>
            {recentlyMintedSpaceToken ? (
                <MintAnimation targetRef={profileButtonRef} info={recentlyMintedSpaceToken} />
            ) : (
                <></>
            )}
            <Card horizontal minHeight="x6">
                <Box
                    centerContent
                    width="x8"
                    tooltip="Go to towns.com"
                    tooltipOptions={{
                        placement: 'horizontal',
                        immediate: true,
                    }}
                    data-testid="towns-logo"
                >
                    <a href="https://towns.com" rel=", noopener noreferrer" target="_blank">
                        <LogoSingleLetter />
                    </a>
                </Box>
                <Box centerContent width="x8" />
                <Box grow centerContent>
                    {!noSearchBar && <SearchBar />}
                </Box>

                <Stack horizontal gap="md" paddingRight="lg" alignItems="center">
                    <PointsButton />
                    {isHNTMember && <WalletButton />}
                    <NodeStatusButton />
                    <BugReportButton />
                    <Box ref={profileButtonRef}>
                        <ProfileCardButton />
                    </Box>
                </Stack>
            </Card>
        </>
    )
}
