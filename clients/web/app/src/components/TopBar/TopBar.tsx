import React, { useRef } from 'react'
import { BugReportButton } from '@components/BugReportButton/BugReportButton'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SearchBar } from '@components/SearchBar/SearchBar'
import { Box, Card, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { MintAnimation } from '@components/MintAnimation/MintAnimation'
import { useStore } from 'store/store'
import { NodeStatusButton } from '@components/NodeConnectionStatusPanel/ConnectionStatusButton'

export const TopBar = () => {
    const { recentlyMintedSpaceToken } = useStore()
    const profileButtonRef = useRef<HTMLElement>(null)

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
                >
                    <a href="https://towns.com" rel=", noopener noreferrer" target="_blank">
                        <LogoSingleLetter />
                    </a>
                </Box>
                <Box centerContent width="x8" />
                <Box grow centerContent>
                    <SearchBar />
                </Box>

                <Stack horizontal gap="md" paddingRight="lg" alignItems="center">
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
